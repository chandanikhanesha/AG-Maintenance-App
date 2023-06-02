const puppeteer = require("puppeteer");
const AWS = require("aws-sdk");
const path = require("path");
var fs = require("fs");
const s3 = new AWS.S3({
  endpoint: process.env.BUCKET_ENDPOINT,

  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});
const { client } = require("./connection");
const { v4: uuidv4 } = require("uuid");

const bucket = process.env.BUCKET;
var os = require("os");

const buildTimeStamp = () => {
  const dateAndTime = new Date().toISOString().split("T");
  return `${dateAndTime[0]}:${dateAndTime[1].split(":")[0]}`;
};

const uuid = uuidv4();
const seasonYear = new Date().getFullYear();
const URL = process.env.URL;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

const DowanloadCsv = async (req, res) => {
  const { customCustId, customPoId } = req.body;
  const homedir = os.homedir();

  console.log(req.body.orgName, "----");
  console.log("csv download process start......");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });

  let listOrgLength = 0;
  let currentIndex = 0;

  if (req.body.orgName == "all") {
    while (currentIndex <= listOrgLength) {
      await login(currentIndex);
    }
  } else if (req.body.orgName != "all") {
    await login(null, req.body.orgName);
  }

  async function login(index, selectedorgName) {
    try {
      await page.goto(`${URL}/log_in`);
      await page.waitForTimeout(500);

      await page.type("#email", EMAIL, { delay: 50 });
      await page.type("#password", PASSWORD, { delay: 50 });

      await page.click('[type="submit"]');
      await page.waitForTimeout(2000);
      await page.click("#standard-select-organizations");

      const listOrg = await page.$$(
        "#menu- > div.MuiPaper-root.MuiMenu-paper.MuiPopover-paper.MuiPaper-elevation8.MuiPaper-rounded > ul > li"
      );
      console.log(currentIndex, "currentIndex");
      await Promise.all(
        listOrg.map(async (item, indexOrg) => {
          const orgName1 = await (
            await item.getProperty("innerText")
          ).jsonValue();
          if (selectedorgName === orgName1) {
            console.log(orgName1, "orgName1", indexOrg);

            index = indexOrg;
          }
        })
      );
      await page.waitForTimeout(3000);

      // console.log(listOrg[index], "  listOrg[index] ");

      // if (selectedorgName == null) {
      await listOrg[index].click();
      // } else {
      //   await page.click(`#${selectedorgName}`);
      // }

      listOrgLength = listOrg.length;
      currentIndex++;

      await page.evaluate(() => {
        document.getElementById("orgSubmit").click();
      });
      await page.waitForTimeout(2000);

      await page.goto(`${URL}/app/customers`, {
        waitUntil: ["domcontentloaded", "networkidle0"],
      });

      await page.waitForTimeout(1000);

      const orgId = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:organizationReducer");
        return JSON.parse(json).id;
      });
      console.log(orgId, "orgId");
      const orgName = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:organizationReducer");
        return JSON.parse(json).name;
      });
      console.log("loaded", orgName);
      await page.waitForTimeout(4000);

      const ApiID = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
        return JSON.parse(json).apiSeedCompanies[0].id;
      });
      await page.waitForTimeout(2000);

      const downloadPath = path.resolve(`${homedir}/inventory`);
      console.log(ApiID, "ApiID");
      // DealerOrderDeatilPage;
      if (ApiID) {
        for (let i = 0; i < 4; i++) {
          let cornType;
          if (i === 0) {
            cornType = "corn";
          } else if (i === 1) {
            cornType = "soybean";
          } else if (i === 2) {
            cornType = "canola";
          } else if (i === 3) {
            cornType = "sorghum";
          }
          // else if (i === 4) {
          //   cornType = "packaging";
          // }

          try {
            //PurchaseOrderReports report
            await page.goto(
              `${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${i}`,
              {
                waitUntil: ["domcontentloaded", "networkidle0"],
              }
            );
            await page.click(`#${cornType}`);
            await page.waitForTimeout(1000);
            await page.evaluate(() => {
              document.getElementById("dotBtns").click();
            });
            await page.waitForTimeout(1000);

            await page.evaluate(() => {
              document.getElementById("downloadPO").click();
            });
            await page.waitForTimeout(1000);

            await page.click("#customerDot");

            await page.waitForTimeout(1500);
            await page.click("#downloadCsv");

            await storeCSV(
              `${homedir}/inventory/${cornType}PurchaseOrderReports.csv`,
              `Bayer${cornType}PurchaseOrder`
            );

            // AllDealer report
            await page.waitForTimeout(1000);
            await page.goto(
              `${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${i}`,
              {
                waitUntil: ["domcontentloaded", "networkidle0"],
              }
            );
            await page.click(`#${cornType}`);
            await page.waitForTimeout(1000);
            await page.evaluate(() => {
              document.getElementById("dotBtns").click();
            });

            await page.evaluate(() => {
              document.getElementById("downloadAllDealer").click();
            });
            await page.waitForTimeout(1000);

            await page.click("#customerDot");
            await page.waitForTimeout(1500);
            await page.click("#downloadCsv");

            await storeCSV(
              `${homedir}/inventory/${cornType}ReceivedReturns.csv`,
              `Bayer${cornType}AllDealer`
            );
            await page.waitForTimeout(1500);

            await page.goto(`${URL}/app/reports/inventory_report`, {
              waitUntil: ["domcontentloaded", "networkidle0"],
            });
            await page.waitForTimeout(1500);

            await page.click("#selectCompaines");
            await page.click("#bayer");
            await page.waitForTimeout(2000);
            console.log(cornType, "", i);
            await page.click("#selectedCropType");
            await page.waitForTimeout(2000);
            await page.click(`#${cornType}`);
            await page.click("#generateReport");
            await page.waitForTimeout(3000);

            await page.click("#customerDot");
            await page.waitForTimeout(1000);

            await page.click("#downloadCsv");
            await page.click("#customerDot");
            await page.waitForTimeout(1000);

            await storeCSV(
              `${homedir}/inventory/${cornType}Inventory.csv`,
              `Bayer${cornType}Inventory`
            );
            await page.waitForTimeout(1500);

            await page.goto(`${URL}/app/reports/profit_report`, {
              waitUntil: ["domcontentloaded", "networkidle0"],
            });
            await page.waitForTimeout(1500);

            await page.click("#selectCompaines");
            await page.click("#bayer");
            await page.waitForTimeout(2000);

            console.log(cornType, "cron[i]", i);
            await page.click("#selectedCropType");
            await page.waitForTimeout(2000);
            await page.click(`#${cornType}`);
            await page.click("#generateReport");
            await page.waitForTimeout(3000);

            await page.click("#customerDot");
            await page.waitForTimeout(1000);

            await page.click("#downloadCsv");
            await page.click("#customerDot");
            await page.waitForTimeout(1000);

            await storeCSV(
              `${homedir}/inventory/${cornType}ProfitReport.csv`,
              `Bayer${cornType}ProfitInventory`
            );
            await page.waitForTimeout(2000);
          } catch (e) {
            console.log(e, "ee");
          }
          await page.waitForTimeout(5000);
          console.log(`Dealer Order Deatailed/selected tab- ${i}`);
        }
      }

      // Seed compines
      const seedCompanyData = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:seedCompanyReducer");
        return JSON.parse(json);
      });

      const allSeedComopany = seedCompanyData.seedCompanies;
      for (let i = 0; i < allSeedComopany.length; i++) {
        const seedId = allSeedComopany[i].id;

        let typeArray = [
          ...new Map(
            allSeedComopany[i].Products.map((item) => [item["seedType"], item])
          ).values(),
        ];
        console.log(seedId, "seedId", typeArray.length, "typeArray");

        await page.goto(`${URL}/app/reports/inventory_report`, {
          waitUntil: ["domcontentloaded", "networkidle0"],
        });

        await page.click("#selectCompaines");
        await page.waitForTimeout(2000);

        await page.click(`#seed-${seedId}`);
        await page.waitForTimeout(3000);

        for (let i = 0; i < typeArray.length; i++) {
          if (seedId) {
            try {
              if (typeArray.length > 0) {
                const typeArrayData = typeArray[i].seedType
                  .toLocaleLowerCase()
                  .replace(/ /g, "");
                console.log(typeArrayData, "typeArray[i].seedType");

                await page.click("#selectedCropType");
                await page.waitForTimeout(2000);
                await page.click(`#${typeArrayData}`);
                await page.waitForTimeout(1000);

                await page.click("#generateReport");
                await page.waitForTimeout(3000);

                await page.click("#customerDot");
                await page.waitForTimeout(1000);

                await page.click("#downloadCsv");
                await page.click("#customerDot");
                await page.waitForTimeout(2000);

                await storeCSV(
                  `${homedir}/inventory/${typeArrayData}Inventory.csv`,
                  `Seed${typeArrayData}Inventory`
                );
              } else {
                console.log("No Product Found");
              }
            } catch (error) {
              console.log("poID " + seedId, error);
            }
          } else console.log("no seed Company found");
        }

        await page.goto(`${URL}/app/reports/profit_report`, {
          waitUntil: ["domcontentloaded", "networkidle0"],
        });

        await page.click("#selectCompaines");
        await page.waitForTimeout(2000);

        await page.click(`#seed-${seedId}`);
        await page.waitForTimeout(3000);

        for (let i = 0; i < typeArray.length; i++) {
          if (seedId) {
            try {
              if (typeArray.length > 0) {
                const typeArrayData = typeArray[i].seedType
                  .toLocaleLowerCase()
                  .replace(/ /g, "");
                console.log(typeArrayData, "typeArray[i].seedType");

                await page.click("#selectedCropType");
                await page.waitForTimeout(2000);
                await page.click(`#${typeArrayData}`);
                await page.waitForTimeout(1000);

                await page.click("#generateReport");
                await page.waitForTimeout(3000);

                await page.click("#customerDot");
                await page.waitForTimeout(1000);

                await page.click("#downloadCsv");
                await page.click("#customerDot");
                await page.waitForTimeout(2000);

                await storeCSV(
                  `${homedir}/inventory/${typeArrayData}profitSeed.csv`,
                  `Seed${typeArrayData}profitSeed`
                );
              } else {
                console.log("No Product Found");
              }
            } catch (error) {
              console.log("poID " + seedId, error);
            }
          } else console.log("no seed Company found");
        }
        await page.waitForTimeout(3000);

        for (let i = 0; i < typeArray.length; i++) {
          if (seedId) {
            try {
              if (typeArray.length > 0) {
                // seedGrowerDetail report
                await page.goto(
                  `${URL}/app/seed_companies/${seedId}?selectedTab=${i}`,
                  {
                    waitUntil: ["domcontentloaded", "networkidle0"],
                  }
                );

                await page.evaluate(() => {
                  document.getElementById("nonBayerBtn").click();
                });
                await page.waitForTimeout(1000);

                await page.evaluate(() => {
                  document.getElementById("nonBayerGrowerDetail").click();
                });
                await page.waitForTimeout(4000);

                await page.click("#customerDot");
                await page.waitForTimeout(1000);
                await page.click("#downloadCsv");
                await page.waitForTimeout(500);

                storeCSV(
                  `${homedir}/inventory/seedGrowerDetail.csv`,
                  "seedGrowerDetail"
                );
                //seedGrowerSummary report
                await page.goto(
                  `${URL}/app/seed_companies/${seedId}?selectedTab=${i}`,
                  {
                    waitUntil: ["domcontentloaded", "networkidle0"],
                  }
                );

                await page.evaluate(() => {
                  document.getElementById("nonBayerBtn").click();
                });
                await page.waitForTimeout(1000);

                await page.evaluate(() => {
                  document.getElementById("nonBayerGrowerSummary").click();
                });
                await page.waitForTimeout(4000);

                await page.click("#customerDot");
                await page.waitForTimeout(1000);
                await page.click("#downloadCsv");

                storeCSV(
                  `${homedir}/inventory/seedGrowerSummary.csv`,
                  "seedGrowerSummary"
                );
                await page.waitForTimeout(500);
              } else {
                console.log("No Product Found");
              }
            } catch (error) {
              console.log("poID " + seedId, error);
            }
          }
        }
        await page.waitForTimeout(3000);
      }
      console.log("Done seed comapinees 👍");

      // all normal company data

      const CompanyData = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:companyReducer");
        return JSON.parse(json);
      });

      const allCompany = CompanyData.companies;

      for (let i = 0; i < allCompany.length; i++) {
        const Id = allCompany[i].id;
        if (Id) {
          try {
            // await page.goto(`${URL}/app/companies/${Id}`, {
            //   waitUntil: ["domcontentloaded", "networkidle0"],
            // });
            // await page.evaluate(() => {
            //   document.getElementById("nonBayerBtn").click();
            // });
            //regularInventory report
            // await page.waitForTimeout(1000);
            // await page.evaluate(() => {
            //   document.getElementById("nonBayerInventory").click();
            // });
            // await page.waitForTimeout(1500);
            // await page.click("#downloadCsv");

            // storeCSV(
            //   `${homedir}/inventory/regularInventory.csv`,
            //   "regularInventory"
            // );
            await page.waitForTimeout(500);

            //regularGrowerDetail report
            await page.goto(`${URL}/app/companies/${Id}`, {
              waitUntil: ["domcontentloaded", "networkidle0"],
            });
            await page.evaluate(() => {
              document.getElementById("nonBayerBtn").click();
            });
            await page.waitForTimeout(1000);
            await page.evaluate(() => {
              document.getElementById("nonBayerGrowerDetail").click();
            });

            await page.waitForTimeout(4000);

            await page.click("#customerDot");

            await page.waitForTimeout(1000);
            await page.click("#downloadCsv");

            storeCSV(
              `${homedir}/inventory/regularGrowerDetail.csv`,
              "regularGrowerDetail"
            );
            await page.waitForTimeout(500);

            //regularGrowerSummary report
            await page.goto(`${URL}/app/companies/${Id}`, {
              waitUntil: ["domcontentloaded", "networkidle0"],
            });
            await page.evaluate(() => {
              document.getElementById("nonBayerBtn").click();
            });
            await page.waitForTimeout(1000);
            await page.evaluate(() => {
              document.getElementById("nonBayerGrowerSummary").click();
            });
            await page.waitForTimeout(4000);

            await page.click("#customerDot");

            await page.waitForTimeout(1000);
            await page.click("#downloadCsv");
            await page.waitForTimeout(500);

            storeCSV(
              `${homedir}/inventory/regularGrowerSummary.csv`,
              "regularGrowerSummary"
            );

            await page.goto(`${URL}/app/reports/inventory_report`, {
              waitUntil: ["domcontentloaded", "networkidle0"],
            });

            await page.click("#selectCompaines");

            await page.click(`#regular-${Id}`);
            await page.waitForTimeout(1500);
            await page.click("#generateReport");
            await page.waitForTimeout(1500);

            await page.click("#customerDot");
            await page.waitForTimeout(1000);

            await page.click("#downloadCsv");
            await page.click("#customerDot");
            await page.waitForTimeout(2000);

            storeCSV(
              `${homedir}/inventory/regularInventory.csv`,
              "regularInventory"
            );
            await page.waitForTimeout(3000);
            await page.goto(`${URL}/app/reports/profit_report`, {
              waitUntil: ["domcontentloaded", "networkidle0"],
            });

            await page.click("#selectCompaines");

            await page.click(`#regular-${Id}`);
            await page.waitForTimeout(1500);
            await page.click("#generateReport");
            await page.waitForTimeout(1500);

            await page.click("#customerDot");
            await page.waitForTimeout(1000);

            await page.click("#downloadCsv");
            await page.click("#customerDot");
            await page.waitForTimeout(2000);

            storeCSV(
              `${homedir}/inventory/regularProfitReport.csv`,
              "regularInventory"
            );
            await page.waitForTimeout(3000);
          } catch (error) {
            console.log("poID " + Id, error);
          }
        } else console.log("no regular Company found");
      }
      console.log("Done Normal company 👍 ");

      async function storeCSV(downloadPath, key) {
        fs.readFile(downloadPath, "utf8", (err, data) => {
          console.log(data, "data");
          if (data) {
            s3.upload({
              Bucket: bucket,
              Key: `inventory-report-backup/${uuid}/${orgId}/${orgName}/inventory/${seasonYear}/${buildTimeStamp()}/${key}.csv`,
              Body: data,
              ACL: "private",
            })
              .promise()
              .then((res) => {
                const url = s3.getSignedUrl("getObject", {
                  Bucket: bucket,
                  Key: `inventory-report-backup/${uuid}/${orgId}/${orgName}/inventory/${seasonYear}/${buildTimeStamp()}/${key}.csv`,
                  Expires: 315360000,
                });

                console.log("url", url);

                const query = {
                  text: `INSERT INTO public."Backups"("organizationId", "pdfLink", "seasonYear", "createdAt", "updatedAt")
                 VALUES(${orgId},'${url}','${seasonYear}', '${new Date().toDateString()}','${new Date().toDateString()}')`,
                };

                client.query(query, (err, res) => {
                  if (err) {
                    console.log("query error", err.stack);
                  } else {
                    // console.log(res);
                    // console.log(res.rows[0]);
                    console.log("create Succesfully", url);
                  }
                });
                // console.log(res);
              })
              .catch((e) => {
                console.log(e, "e");
                return res.status(500).json({ success: "False" });
              });
          }
        });
      }

      await page.goto(`${URL}/app/customers`, {
        waitUntil: ["domcontentloaded"],
      });
      await page.evaluate(() => localStorage.clear());
    } catch (e) {
      console.log("hureeee", e);

      currentIndex++;
    }
  }

  browser.close();
  return res.status(200).json({ success: "Done" });
};

module.exports = DowanloadCsv;
