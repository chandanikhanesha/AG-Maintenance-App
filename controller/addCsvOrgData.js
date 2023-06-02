const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { client } = require("./connection");

const URL = process.env.URL;
const APIURL = process.env.APIURL;
const os = require("os");
let storeResponse = [];
const csvParser = require("csv-parser");

const homedir = os.homedir();

const addCsvOrgData = async (req, res) => {
  console.log("started");
  // req.body.orgName = "BAR DOUBLE DIAMOND SEED";
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1466, height: 868 });
  const path1 = path.join(__dirname, "../organizationData.csv");
  console.log(path1, "path1");
  let data = [];
  await fs
    .createReadStream(path1)
    .on("error", (err) => {
      console.log(err);
      // handle error
    })
    .pipe(csvParser())
    .on("data", async (row) => {
      data.push(row);
    })
    .on("end", async () => {
      console.log(data.length, "----");
      data.map((row, i) => {
        setTimeout(async () => {
          console.log(row.orgName, "row");

          await page.goto(`${URL}/sign_up`);
          await page.waitForTimeout(1000);
          await page.type("#organization-name", `${row.orgName}`, {
            delay: 50,
          });
          await page.type("#address", `${row.address}`, { delay: 50 });
          // await page.type("#businessStreet", `${row.city}`, { delay: 50 });

          await page.type("#businessCity", `${row.city}`, { delay: 50 });

          await page.type("#businessState", `${row.state}`, { delay: 50 });

          await page.type("#businessZip", `${row.zip}`, { delay: 50 });

          await page.click('[type="button"]');
          await page.waitForTimeout(2000);

          await page.type("#userFirstName", `${row.fname}`, { delay: 50 });
          await page.type("#userLastName", `${row.lname}`, { delay: 50 });
          await page.type("#phoneNumber", `${row.phoneNumber}`, {
            delay: 50,
          });
          await page.type("#user-email", `${row.userEmail}`, {
            delay: 50,
          });
          await page.type("#user-password", `${row.password}`, {
            delay: 50,
          });
          await page.type("#user-passwordConfirmation", `${row.password}`, {
            delay: 50,
          });
          await page.waitForTimeout(1000);

          await page.click("#createUser");

          await page.on("response", async (response) => {
            if (response.url() == `${APIURL}/api/auth/sign_up`) {
              console.log("XHR response received");
              const resdata = await response.json();
              console.log(resdata, "data");

              if (!resdata.errors) {
                const query = {
                  text: `UPDATE public."Users" SET "verificationDate"='${new Date().toDateString()}' WHERE email='${
                    row.userEmail
                  }'`,
                };

                await client.query(query, async (err, res2) => {
                  console.log(err, "err");
                });

                await page.waitForTimeout(2000);

                await page.goto(`${URL}/log_in`);
                await page.waitForTimeout(1000);

                await page.type("#email", `${row.userEmail}`, { delay: 50 });
                await page.type("#password", `${row.password}`, {
                  delay: 50,
                });

                await page.click('[type="submit"]');
                await page.waitForTimeout(2000);

                await page.goto(`${URL}/app/customers`, {
                  waitUntil: ["domcontentloaded", "networkidle0"],
                });
                await page.waitForTimeout(1000);
                const bayername = row.bayername;
                const bayerpassword = row.bayerpassword;
                const bayerGlnID = row.bayerGlnID;
                await bayerConnectivity(
                  page,
                  bayername,
                  bayerpassword,
                  bayerGlnID
                );
                await page.waitForTimeout(2000);

                await page.click("#sideMenu");
                await page.waitForTimeout(1000);

                await page.click("#signOut");

                // if (data.length == i - 1) {
                //   await browser.close();
                // }
              }
            }
          });
        }, 50000 * i - i);
      });
    });
};

module.exports = addCsvOrgData;
const bayerConnectivity = async (
  page,
  bayername,
  bayerpassword,
  bayerGlnID
) => {
  // connnect with bayer company
  await page.goto(`${URL}/app/companies/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.evaluate(() => {
    document.getElementById("bayerConnectivityBtn").click();
  });
  await page.waitForTimeout(500);
  const isExit = await page.evaluate(() => {
    const d = document.getElementById("bayerUserName");
    return d;
  });

  if (isExit !== null) {
    await page.waitForTimeout(500);

    await page.type("#bayerUserName", `${bayername}`, { delay: 50 });
    await page.type("#bayerPassword", `${bayerpassword}`, { delay: 50 });
    await page.type("#bayerGlnID", `${bayerGlnID}`, { delay: 50 });
    await page.evaluate(() => {
      document.getElementById("connectWithBayer").click();
    });

    await page.waitForTimeout(6000);

    await page.click("#creteByer");
    await page.waitForTimeout(3000);

    const ApiData = await page.evaluate(() => {
      const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
      return JSON.parse(json);
    });
    await page.waitForTimeout(1000);
    // const ApiID =
    //   (ApiData.apiSeedCompanies[0] && ApiData.apiSeedCompanies[0].id) || 20;

    // //synce dealer deatiled page
    // await page.goto(
    //   `${URL}/app/p_api_seed_companies/${ApiID}?selectedTab=${0}`,
    //   {
    //     waitUntil: ["domcontentloaded", "networkidle0"],
    //   }
    // );
    // await page.waitForTimeout(1000);

    // page.click("#dotBtns");
    // await page.waitForTimeout(500);
    // //click sync latest price sheet option

    // await page.click("#syncInventory");

    // await page.waitForTimeout(5000);

    //synce dealer summury page

    // await page.goto(`${URL}/app/api_seed_companies/${ApiID}?selectedTab=${0}`, {
    //   waitUntil: ["domcontentloaded", "networkidle0"],
    // });

    // await page.waitForTimeout(1000);
    // await page.evaluate(() => {
    //   document.getElementById("dealerSummuryDots").click();
    // });
    // await page.waitForTimeout(500);
    // //click sync latest price sheet option
    // await page.evaluate(() => {
    //   document.getElementById("syncInventorySummary").click();
    // });

    // await page.waitForTimeout(3000);

    //sync latest price sheet

    // await page.goto(
    //   `${URL}/app/pp_api_seed_companies/${ApiID}?selectedTab=${0}`,
    //   {
    //     waitUntil: ["domcontentloaded", "networkidle0"],
    //   }
    // );

    // await page.waitForTimeout(1000);

    // //click on 3 dots in price sheet page
    // await page.evaluate(() => {
    //   document.getElementById("dotBtnsInPriceSheet").click();
    // });
    // await page.waitForTimeout(500);
    // //click sync latest price sheet option
    // await page.evaluate(() => {
    //   document.getElementById("syncLatestPricesheet").click();
    // });
    // await page.waitForTimeout(8000);
  } else {
    bayerConnectivity(page);
  }
};
