const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Kullanıcıdan terminalde bilgi almak için fonksiyon
function promptUser(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

// Kullanıcıdan form bilgilerini al
async function getFormData() {
    const nereden = await promptUser('Nereden (ör: Ankara): ');
    const nereye = await promptUser('Nereye (ör: Eskişehir): ');
    const tarih = await promptUser('Tarih (YYYY-AA-GG): ');
    const saat = await promptUser('Saat aralığı (örn: 09:00-12:00, opsiyonel): ');
    return { nereden, nereye, tarih, saat };
}

// Kullanıcı profilini JSON'dan oku
async function getUserProfile() {
    const data = await fs.readFile(path.join(__dirname, 'user-profile.json'), 'utf-8');
    return JSON.parse(data);
}

// Ana otomasyon fonksiyonu
async function runBot(formData, userProfile) {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();

    try {
        // TCDD bilet sayfasına git
        await page.goto('https://ebilet.tcddtasimacilik.gov.tr/', { waitUntil: 'networkidle2' });

        // Duyuru popup'ı varsa kapat
        try {
            await page.waitForSelector('.ui-dialog-titlebar-close', { timeout: 3000 });
            await page.click('.ui-dialog-titlebar-close');
        } catch (e) {
            // Popup yoksa hata verme, devam et
        }

        // Kalkış ve varış istasyonlarını doldur
        await page.type('#nereden', formData.nereden, { delay: 100 });
        await page.waitForSelector('ul.ui-autocomplete');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await page.type('#nereye', formData.nereye, { delay: 100 });
        await page.waitForSelector('ul.ui-autocomplete');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Tarih alanını doldur
        await page.click('#trCalGid_input', { clickCount: 3 });
        await page.type('#trCalGid_input', formData.tarih, { delay: 100 });
        await page.keyboard.press('Enter');

        // Sefer ara butonuna tıkla
        await page.click('#btnSeferSorgula');
        await page.waitForSelector('#main-content', { timeout: 15000 });

        // Seferleri kontrol et
        const seferler = await page.$$('.seferSatir');
        if (seferler.length === 0) {
            console.log('❌ Uygun sefer bulunamadı.');
            await browser.close();
            return;
        }

        // Sefer saat ve fiyat bilgilerini al
        let secilenSefer = null;
        for (const sefer of seferler) {
            const saat = await sefer.$eval('.saat', el => el.innerText);
            // Saat aralığı kontrolü (opsiyonel)
            if (formData.saat) {
                const [start, end] = formData.saat.split('-');
                if (saat < start || saat > end) continue;
            }
            const fiyat = await sefer.$eval('.fiyat', el => el.innerText);
            secilenSefer = { sefer, saat, fiyat };
            break;
        }

        if (!secilenSefer) {
            console.log('❌ Belirtilen saat aralığında sefer bulunamadı.');
            await browser.close();
            return;
        }

        // Seferi seç ve devam et
        await secilenSefer.sefer.$eval('button', btn => btn.click());
        await page.waitForSelector('#yolcuBilgileriFormu', { timeout: 10000 });

        // Yolcu bilgilerini doldur
        await page.type('#yolcuTc', userProfile.tc);
        await page.type('#yolcuAd', userProfile.ad);
        await page.type('#yolcuSoyad', userProfile.soyad);
        await page.type('#yolcuDogumTarihi', userProfile.dogumTarihi);
        await page.type('#yolcuCepTel', userProfile.telefon);
        await page.type('#yolcuEposta', userProfile.email);

        // Devam et butonuna tıkla
        await page.click('#btnDevamEt');
        // CAPTCHA veya SMS doğrulama çıkarsa burada bekle
        console.log('⚠️ CAPTCHA veya SMS doğrulama varsa lütfen manuel olarak tamamlayın.');
        await promptUser('Devam etmek için ENTER\'a basın...');

        // Ödeme ekranına gelindi mi kontrol et
        await page.waitForSelector('#odemeEkrani', { timeout: 20000 });
        console.log('✅ Ödeme ekranına ulaşıldı! Lütfen ödemeyi manuel olarak tamamlayın.');

        // Sefer ve fiyat bilgisini kaydet
        await fs.writeFile('secilen-sefer.json', JSON.stringify({
            saat: secilenSefer.saat,
            fiyat: secilenSefer.fiyat,
            tarih: formData.tarih,
            nereden: formData.nereden,
            nereye: formData.nereye
        }, null, 2));
        console.log('Sefer ve fiyat bilgisi secilen-sefer.json dosyasına kaydedildi.');

    } catch (err) {
        console.error('Bir hata oluştu:', err.message);
    } finally {
        // Tarayıcıyı kapatma, kullanıcı manuel kapatabilir
    }
}

// Ana akış
(async () => {
    const formData = await getFormData();
    const userProfile = await getUserProfile();
    await runBot(formData, userProfile);
})(); 