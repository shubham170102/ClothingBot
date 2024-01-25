const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const localChrome = require('chrome-location');

puppeteer.use(StealthPlugin());

const prompt = require('prompt-sync')();


async function payment(page) {

    // Fake Credit Card info

    await page.waitForSelector("iframe[title='Field container for: Card number']")
    await page.waitForTimeout(2000)

    let iframe = await page.$("iframe[title='Field container for: Card number']")
    let iframeElement = await iframe.contentFrame()
    await iframeElement.type("input[id='number']", '5529960000869293')

    iframe = await page.$("iframe[title='Field container for: Name on card']")
    iframeElement = await iframe.contentFrame()
    await iframeElement.type("input[id='name']", 'Aiden Robinson')

    iframe = await page.$("iframe[title='Field container for: Expiration date (MM / YY)']")
    iframeElement = await iframe.contentFrame()
    await iframeElement.type("input[id='expiry']", '07/25')

    iframe = await page.$("iframe[title='Field container for: Security code']")
    iframeElement = await iframe.contentFrame()
    await iframeElement.type("input[id='verification_value']", '909')

    await page.waitForTimeout(2000)
    await page.evaluate(() => document.getElementById('continue_button').click()); // last step

}

async function checkout(page) {

    //await page.goto('https://us.checkout.gymshark.com/1566146/checkouts/60f3692ac27ed37f2e68dcf73ffdf1bb');
    //await page.waitForTimeout(1500);
    await page.evaluate(() => {
        document.querySelector('a[data-locator-id="miniBag-checkout-select"]').click()
    })

    await page.waitForSelector('#checkout_shipping_address_province');
    await page.waitForTimeout(1500);
    await page.select("#checkout_shipping_address_province", "Indiana");

    await page.evaluate(() => {
        document.getElementById('checkout_email').value = "email@gmail.com"
        document.getElementById('checkout_shipping_address_first_name').value = "First name enter here"
        document.getElementById('checkout_shipping_address_last_name').value = "Last name enter here"
        document.getElementById('checkout_shipping_address_address1').value = "Enter Address 1"
        document.getElementById('checkout_shipping_address_address2').value = "Enter Address 2"
        document.getElementById('checkout_shipping_address_city').value = "Enter City"
        document.getElementById('checkout_shipping_address_province').value = "IN"; // Select State (XX form) Ex. IN
        document.getElementById('checkout_shipping_address_zip').value = "Enter Zipcode";
        document.getElementById('checkout_shipping_address_phone').value = "Enter phone number";
    })

    await page.waitForTimeout(2000)
    await page.evaluate(() => document.getElementById('continue_button').click());

    // continue to estimate shipping date
    await page.waitForTimeout(2000)
    await page.waitForSelector("#continue_button")
    await page.evaluate(() => document.getElementById('continue_button').click());

    await payment(page);
}

async function monitor(page, targetColor, targetSize) {
    await page.goto('https://www.gymshark.com/products/gymshark-arrival-5-shorts-black-ss22');
    await page.waitForTimeout(2000);

    await page.evaluate((targetColor) => {
        let links = document.querySelectorAll("a[class]");
        let shortLinks = [];
        for (let i = 0; i < links.length; i++) {
            if (links[i].href.indexOf("arrival-5-shorts") > -1) {
                shortLinks.push(links[i]); // collections of <a> that corresponds to shorts
            }
        }

        for (let i = 0; i < shortLinks.length; i++) {
            if (shortLinks[i].href.toLowerCase().indexOf(targetColor) > -1) {
                shortLinks[i].click();
                break;
            }
        }

    }, targetColor)

    await page.waitForTimeout(1500);

    let isAvailable = await page.evaluate(targetSize => {
        let sizes = document.querySelectorAll('button[class="size_size__zRXlq"]');
        let available = false;
        for (let i = 0; i < sizes.length; i++) {
            if (sizes[i].innerText.toLowerCase() == targetSize) {
                available = true;
                sizes[i].click();
                break;
            }
        }
        return available
    }, targetSize)

    await page.waitForTimeout(1500);
    //console.log(isAvailable)

    if (isAvailable) {
        await page.evaluate(() => {
            document.querySelector('i[class="icon-tick"]').click()
        })
        await page.waitForTimeout(2000);
        return true
    }
    return false
}

async function run() {
    const browser = await puppeteer.launch({headless: false, executablePath: localChrome})
    const page = await browser.newPage();

    let targetColor = prompt("What color shorts do you want: ").trim().toLowerCase();
    let targetSize = prompt("What size are looking for: ").trim().toLowerCase();

    while (true) {
        try {
            let isAvailable = await monitor(page, targetColor, targetSize);
            console.log("Availability:", isAvailable);

            if (isAvailable) {
                await page.waitForTimeout(7000);
                await checkout(page);
                break;
            } else {
                console.log("Product not available. Retrying...");
                await page.waitForTimeout(5000);
            }
        } catch (error) {
            console.error("An error occurred:", error);
            await page.screenshot({ path: 'error.png' });
            // Handle error or retry logic here
        }
    }

}

run();