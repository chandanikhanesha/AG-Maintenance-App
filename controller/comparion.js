const puppeteer = require("puppeteer");
// const { PendingXHR } = require("pending-xhr-puppeteer");
const fs = require("fs");
const path = require("path");
const jsonDiff = require("json-diff");
const diff = require("nested-object-diff").diff;
const { parsePurchaseOrder } = require("../helper");

const USERNAME = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

const compareResult = async (req, res) => {
  const after = fs.readFileSync(
    path.join(__dirname, "../public/json/after.json"),
    { encoding: "utf8" }
  );
  const before = fs.readFileSync(
    path.join(__dirname, "../public/json/before.json"),
    { encoding: "utf8" }
  );
  // const difference = {};
  // JSON.parse(after).map((aitem) => {
  //   Object.keys(aitem).map((akey) => {
  //     JSON.parse(before).forEach((bitem) => {
  //       if (bitem[akey]) {
  //         console.log(bitem[akey]);
  //       } else {
  //         console.log("no found");
  //       }
  //     });
  //     //   if(bitem === aitem){
  //     //     name = akey;
  //     //   }
  //     //   // aitem[akey].map((item2) => {
  //     //   //   console.log(item2);
  //     //   // });
  //   });
  // });
  const differences = diff(JSON.parse(after), JSON.parse(before));
  res.render("compare", { data: JSON.stringify(differences) });
};

const start = async (IsBefore, orgName) => {
  console.log("started");
  orgName = "ALL";
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
  const allData = [];

  if (orgName === "ALL") {
    while (currentIndex < listOrgLength) {
      await login(currentIndex === -1 ? 0 : currentIndex);
    }
  } else {
    await login(null, orgName);
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
      const orgName = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:organizationReducer");
        return JSON.parse(json).name;
      });

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

      console.log("loaded", orgName);
      const customersData = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:customerReducer");
        return JSON.parse(json);
      });

      const Allcustomers = customersData.customers;
      console.log(Allcustomers.length, "Allcustomers");

      for (let i = 0; i < Allcustomers.length; i++) {
        const custId = Allcustomers[i].id;
        if (custId) {
          for (let j = 0; j < Allcustomers[i]["PurchaseOrders"].length; j++) {
            const poID = Allcustomers[i]["PurchaseOrders"][j].id;
            if (poID) {
              try {
                const isQuote = Allcustomers[i]["PurchaseOrders"][j]["isQuote"];
                const { totalObj, balanceDue } = await parsePurchaseOrder(
                  page,
                  URL,
                  custId,
                  poID,
                  isQuote
                );
                Allcustomers[i]["PurchaseOrders"][j]["totalObj"] = totalObj;
                Allcustomers[i]["PurchaseOrders"][j]["balanceDue"] = balanceDue;
              } catch (error) {
                console.log("poID " + poID, error);
              }
            } else console.log("no poID found");
          }
        } else console.log("no customer found");
      }

      allData.push({ [`${String(orgName).replace(/ /g, "")}`]: Allcustomers });
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

  if (IsBefore === "true") {
    fs.writeFileSync(
      path.join(__dirname, "../public/json/before.json"),
      JSON.stringify(allData)
    );
  } else {
    fs.writeFileSync(
      path.join(__dirname, "../public/json/after.json"),
      JSON.stringify(allData)
    );
  }

  browser.close();
  return;
};

module.exports = { start, compareResult };

// start(process.env.EMAIL, process.env.PASSWORD, process.env.ISBEFORE);
