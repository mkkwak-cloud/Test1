from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).resolve().parent
PROFILE_DIR = BASE_DIR / "user_data"

# 코레일 공식 승차권 예매 웹사이트
KORAIL_URL = "https://www.letskorail.com/"

def main():
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=False,
            viewport={"width": 1440, "height": 950},
        )

        page = context.pages[0] if context.pages else context.new_page()
        page.goto(KORAIL_URL, wait_until="domcontentloaded")

        print("브라우저가 열렸습니다.")
        print("처음에는 직접 로그인하고, 이후 열차 조회 화면을 확인하세요.")
        print("로그인 유지 여부는 실제 화면에서 확인해야 합니다.")
        print("종료하려면 이 창에서 Enter를 누르세요.")

        input()
        context.close()

if __name__ == "__main__":
    main()
