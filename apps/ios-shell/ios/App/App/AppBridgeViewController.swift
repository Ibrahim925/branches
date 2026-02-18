import UIKit
import Capacitor

final class AppBridgeViewController: CAPBridgeViewController {
    private let shellBackgroundColor = UIColor(
        red: 245.0 / 255.0,
        green: 241.0 / 255.0,
        blue: 232.0 / 255.0,
        alpha: 1.0
    )
    private var registeredLifecycleObservers = false

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = shellBackgroundColor
        view.insetsLayoutMarginsFromSafeArea = false
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true

        registerLifecycleObservers()
        refreshLayoutForLifecycle()
    }

    deinit {
        unregisterLifecycleObservers()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        refreshLayoutForLifecycle()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        refreshLayoutForLifecycle()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        refreshLayoutForLifecycle()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .darkContent
    }

    func refreshLayoutForLifecycle() {
        additionalSafeAreaInsets = .zero

        guard let webView = bridge?.webView else { return }

        webView.translatesAutoresizingMaskIntoConstraints = true
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.frame = view.bounds
        webView.backgroundColor = shellBackgroundColor
        webView.isOpaque = false

        let scrollView = webView.scrollView
        scrollView.contentInset = .zero
        scrollView.scrollIndicatorInsets = .zero
        scrollView.bounces = false
        scrollView.alwaysBounceVertical = false
        scrollView.alwaysBounceHorizontal = false
        if #available(iOS 13.0, *) {
            scrollView.verticalScrollIndicatorInsets = .zero
            scrollView.automaticallyAdjustsScrollIndicatorInsets = false
        }
        if #available(iOS 11.0, *) {
            scrollView.contentInsetAdjustmentBehavior = .never
        }

        setNeedsStatusBarAppearanceUpdate()
    }

    private func registerLifecycleObservers() {
        if registeredLifecycleObservers { return }

        let center = NotificationCenter.default
        center.addObserver(
            self,
            selector: #selector(handleLifecycleRefresh),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
        center.addObserver(
            self,
            selector: #selector(handleLifecycleRefresh),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )

        registeredLifecycleObservers = true
    }

    private func unregisterLifecycleObservers() {
        if !registeredLifecycleObservers { return }
        NotificationCenter.default.removeObserver(self)
        registeredLifecycleObservers = false
    }

    @objc private func handleLifecycleRefresh() {
        refreshLayoutForLifecycle()
    }
}
