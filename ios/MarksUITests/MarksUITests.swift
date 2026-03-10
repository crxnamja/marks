import XCTest

final class MarksScreenshots: XCTestCase {

    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments += ["-UITest"]
        setupSnapshot(app)
        app.launch()
    }

    func testTakeScreenshots() {
        // 1. Bookmark list — main screen
        let bookmarksList = app.navigationBars["Marks"]
        if bookmarksList.waitForExistence(timeout: 10) {
            snapshot("01_BookmarkList")
        } else {
            // Might be on login screen — try to wait for any content
            sleep(3)
            snapshot("01_BookmarkList")
        }

        // 2. Tap first bookmark to open reader view
        let firstCell = app.cells.firstMatch
        if firstCell.waitForExistence(timeout: 5) {
            firstCell.tap()
            sleep(2) // Wait for reader content to load
            snapshot("02_ReaderView")

            // Go back
            app.navigationBars.buttons.firstMatch.tap()
            sleep(1)
        }

        // 3. Tags tab
        app.tabBars.buttons["Tags"].tap()
        sleep(1)
        snapshot("03_Tags")

        // 4. Settings tab
        app.tabBars.buttons["Settings"].tap()
        sleep(1)
        snapshot("04_Settings")

        // 5. Go back to bookmarks and show search
        app.tabBars.buttons["Bookmarks"].tap()
        sleep(1)

        // Pull down to reveal search bar and type
        let list = app.collectionViews.firstMatch
        if list.exists {
            list.swipeDown()
            sleep(1)
        }
        snapshot("05_Search")
    }
}
