import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function normalizeNextPath(nextPath: string | null, fallback = '/dashboard') {
    if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
        return fallback;
    }
    if (nextPath === '/onboarding' || nextPath.startsWith('/onboarding/')) {
        return fallback;
    }
    return nextPath;
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Refresh the session (important for server-side auth)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // Protected routes: redirect to login if not authenticated
    const isGraphRoute = Boolean(pathname.match(/^\/[0-9a-f-]{36}/));
    const isProtectedRoute =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/onboarding') ||
        isGraphRoute;

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(url);
    }

    if (user) {
        const { data: profileRow } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .maybeSingle();

        const hasProfile = Boolean(profileRow);
        const onboardingCompleted = hasProfile
            ? Boolean(profileRow?.onboarding_completed)
            : true;
        const safeNext = normalizeNextPath(request.nextUrl.searchParams.get('next'));

        const isOnboardingRoute = pathname === '/onboarding' || pathname.startsWith('/onboarding/');
        const isAppRoute =
            pathname.startsWith('/dashboard') ||
            pathname.startsWith('/profile') ||
            isGraphRoute;

        if (!hasProfile && isOnboardingRoute) {
            const url = request.nextUrl.clone();
            url.pathname = safeNext;
            url.search = '';
            return NextResponse.redirect(url);
        }

        if (!onboardingCompleted && isAppRoute && !isOnboardingRoute) {
            const url = request.nextUrl.clone();
            url.pathname = '/onboarding';
            url.search = '';
            url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
            return NextResponse.redirect(url);
        }

        if (onboardingCompleted && isOnboardingRoute) {
            const url = request.nextUrl.clone();
            url.pathname = safeNext;
            url.search = '';
            return NextResponse.redirect(url);
        }

        // Redirect logged-in users away from login page
        if (pathname === '/login') {
            const url = request.nextUrl.clone();
            url.pathname = onboardingCompleted ? safeNext : '/onboarding';
            url.search = '';
            if (!onboardingCompleted) {
                url.searchParams.set('next', safeNext);
            }
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}
