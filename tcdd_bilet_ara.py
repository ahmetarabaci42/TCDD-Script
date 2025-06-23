from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

# Kullanıcıdan bilgi al
kalkis = input("Kalkış istasyonu: ")
varis = input("Varış istasyonu: ")
tarih = input("Tarih (GG.AA.YYYY): ")

# Chrome seçenekleri
chrome_options = Options()
chrome_options.add_experimental_option("detach", True)  # Otomatik kapanmasın

# WebDriver başlat
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=chrome_options)
driver.maximize_window()
wait = WebDriverWait(driver, 20)

try:
    # Siteye git
    driver.get("https://ebilet.tcddtasimacilik.gov.tr/")

    # Kalkış kutusunu bul ve doldur
    kalkis_input = wait.until(EC.presence_of_element_located((By.ID, "nereden")))
    kalkis_input.clear()
    kalkis_input.send_keys(kalkis)
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "ul.ui-autocomplete")))
    kalkis_input.send_keys(Keys.DOWN, Keys.ENTER)

    # Varış kutusunu bul ve doldur
    varis_input = wait.until(EC.presence_of_element_located((By.ID, "nereye")))
    varis_input.clear()
    varis_input.send_keys(varis)
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "ul.ui-autocomplete")))
    varis_input.send_keys(Keys.DOWN, Keys.ENTER)

    # Tarih kutusunu bul ve doldur
    tarih_input = wait.until(EC.presence_of_element_located((By.ID, "trCalGid_input")))
    tarih_input.clear()
    tarih_input.send_keys(tarih)
    tarih_input.send_keys(Keys.ENTER)

    # Bilet ara butonuna tıkla
    ara_buton = wait.until(EC.element_to_be_clickable((By.ID, "btnSeferSorgula")))
    ara_buton.click()

    # Sonuçların yüklenmesini bekle
    wait.until(EC.presence_of_element_located((By.ID, "main-content")))

    # Ekran görüntüsü al
    driver.save_screenshot("bilet_sonucu.png")

    print("\n✅ Bilet arama işlemi tamamlandı! Sonuçların ekran görüntüsü 'bilet_sonucu.png' olarak kaydedildi.\nTarayıcıyı kapatmak için pencereyi elle kapatabilirsiniz.")

except Exception as e:
    print(f"Bir hata oluştu: {e}")

# Not: Tarayıcı otomatik kapanmaz, elle kapatabilirsiniz. 