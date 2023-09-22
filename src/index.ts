require("dotenv").config()
import puppeteer from 'puppeteer';
import { ScrapedProduct, ScrapedProductSite } from "./types/ee"
import { ProductType } from "./types/producttypes"
import jsdom from "jsdom"
const { JSDOM } = jsdom

async function scrapePage(url: string, pagenum: number) {
  const browser = await puppeteer.launch({headless: false, executablePath: `C:/Users/xiaori/AppData/Local/Google/Chrome/Application/chrome.exe`})
  const page = await browser.newPage()
  let pageSlug = "?currentPage="+pagenum;

  await page.goto(url+pageSlug)
  await page.setViewport({width: 1080, height: 1024})

  console.log("Scraping product data...for ", pagenum, "th page")

  const data = await page.content()
  const dom = new JSDOM(data)
  const document = dom.window.document

  const wholePage = document.querySelector("div[arial-label='Search Results']");
  const searchResult = wholePage.querySelector('.SearchResults');
  const itemList = searchResult.querySelectorAll('ul')
  if(!itemList) throw new Error("No items found")

  const items = itemList.children

  for(let item of items) {
      await scrapeItem(item, ProductType.SHOE);
  }

  await page.close()
  await browser.close()

  let newPageNum = pagenum+1;
  return newPageNum;
}

// Scrapping item
async function scrapeItem(item: Element, productType: ProductType) {
  console.log("scrapping item: ", item);

  // get product page link
  const itemLink = item.querySelector("a.ProductCard-link");
  const itemPageLink = "https://www.footlocker.com"+itemLink.getAttribute("href");

  // Open new page
  const browser = await puppeteer.launch({headless: false, executablePath: `C:/Users/xiaori/AppData/Local/Google/Chrome/Application/chrome.exe`})
  const page = await browser.newPage()
  await page.goto(itemPageLink)
  await page.setViewport({width: 1080, height: 1024})
  
  const data = await page.content()
  const dom = new JSDOM(data)
  const document = dom.window.document

  const mainContent = document.querySelector('.Page-body');

  const title = mainContent.querySelector("#pageTitle")?.textContent
  const url = itemPageLink

  const price = mainContent.querySelector('.ProductDetails-form__price').querySelector(".ProductPrice-final")?.textContent?.replace("$","")?.replace(",","");

  const detailContent = document.querySelector('#ProductDetails-tabs');
  const description = detailContent.querySelector('#ProductDetails-tabs-details-panel')?.innerText;
  const images = []
  
  if(!title || !url || !price || !images) {
      console.log("Missing data for product")
      return
  }

  const product: ScrapedProduct = {
      title,
      url,
      price: parseFloat(price),
      images,
      description,
      site: ScrapedProductSite.FOOTLOCKER,
      product_type: productType
  }

  // await DAO.storeProduct(product)

  await page.close()
  await browser.close()
  console.log("Scrapped product", product);
}


async function getAllPage(url: string) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`,
    // args:['--disable-extensions-except=C:/Users/777/AppData/Local/Google/Chrome/User Data/Default/Extensions/fdcgdnkidjaadafnichfpabhfomcebme/9.0.1_0',
    //       '--load-extension=C:/Users/777/AppData/Local/Google/Chrome/User Data/Default/Extensions/fdcgdnkidjaadafnichfpabhfomcebme/9.0.1_0',
    //       '--user-data-dir=%userprofile%\\AppData\\Local\\Chromium\\User Data\\Default'
    //   ]
  });
  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "load",
    timeout: 0,
  });
  await page.waitForSelector("a[aria-label='Go to next page']");

  const data = await page.content()
  const dom = new JSDOM(data)
  const document = dom.window.document
  let nextButton = document.querySelectorAll("a[aria-label='Go to next page']");
  const lastPageElement = nextButton.parentNode.previousSibling;
  console.log("lastElement: ", lastPageElement)
  return parseInt(lastPageElement.innerText);

}

async function scrapeProduct(url: string): Promise<void> {
  const totalPage = await getAllPage(url);
  console.log("totalPage number: ", totalPage);
  let currentPage = 0;

  while(totalPage > currentPage) {
      console.log("Accessing next page...")
      currentPage = await scrapePage(url, currentPage)
  }
}

scrapeProduct("https://www.footlocker.com/en/category/mens/shoes.html");
