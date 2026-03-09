import SwiftUI
import SwiftData

@main
struct MarksApp: App {
    @StateObject private var authVM = AuthViewModel()

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([Bookmark.self, CachedContent.self])
        let config = ModelConfiguration(
            schema: schema
        )
        do {
            return try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            if authVM.isSignedIn {
                ContentView()
                    .environmentObject(authVM)
            } else {
                LoginView()
                    .environmentObject(authVM)
            }
        }
        .modelContainer(sharedModelContainer)
    }
}
