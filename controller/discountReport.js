const puppeteer = require("puppeteer");

const USERNAME = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

const discountReport = async (IsBefore, orgName) => {
  console.log("started");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });
  const URL = process.env.URL;

  // const pendingXHR = new PendingXHR(page);
  let listOrgLength = 0;
  let currentIndex = -1;

  while (currentIndex < listOrgLength) {
    await login(currentIndex === -1 ? 0 : currentIndex);
  }

  async function login(index, selectedorgName) {
    try {
      await page.goto(`${URL}/log_in`);
      await page.waitForTimeout(500);

      await page.type("#email", USERNAME, { delay: 50 });
      await page.type("#password", PASSWORD, { delay: 50 });

      await page.click('[type="submit"]');
      await page.waitForTimeout(2000);

      await page.click("#standard-select-organizations");

      const listOrg = await page.$$(
        "#menu- > div.MuiPaper-root.MuiMenu-paper.MuiPopover-paper.MuiPaper-elevation8.MuiPaper-rounded > ul > li"
      );

      await Promise.all(
        listOrg.map(async (item, indexOrg) => {
          const orgName1 = await (
            await item.getProperty("innerText")
          ).jsonValue();
          if (selectedorgName === orgName1) {
            index = indexOrg;
          }
        })
      );

      await listOrg[index].click();

      listOrgLength = listOrg.length;
      currentIndex++;

      await page.evaluate(() => {
        document.getElementById("orgSubmit").click();
      });
      await page.waitForTimeout(2000);

      await page.goto(`${URL}/app/customers`, {
        waitUntil: ["domcontentloaded", "networkidle0"],
      });
      // await pendingXHR.waitForAllXhrFinished();
      const orgName = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:organizationReducer");
        return JSON.parse(json).name;
      });
      console.log("loaded", orgName);
      const customersData = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:customerReducer");
        return JSON.parse(json);
      });

      const Allcustomers = customersData.customers;

      await page.waitForTimeout(3000);
      for (let i = 0; i < Allcustomers.length; i++) {
        const custId = Allcustomers[i].id;
        if (custId) {
          for (let j = 0; j < Allcustomers[i]["PurchaseOrders"].length; j++) {
            const poID =
              Allcustomers[i]["PurchaseOrders"][j].isQuote !== true &&
              Allcustomers[i]["PurchaseOrders"][j].id;

            if (poID) {
              try {
                await page.goto(
                  `${URL}/app/customers/${custId}/purchase_order/${poID}`,
                  {
                    waitUntil: ["domcontentloaded", "networkidle0"],
                  }
                );
              } catch (error) {
                console.log("poID " + poID, error);
              }
            } else console.log("no poID found");
          }
        } else console.log("no customer found");
      }

      await page.goto(`${URL}/app/customers`, {
        waitUntil: ["domcontentloaded"],
      });
      await page.evaluate(() => localStorage.clear());

      console.log("Done", orgName);
    } catch (error) {
      console.log("error", error);
      currentIndex++;
    }
  }

  browser.close();
};

module.exports = { discountReport };
