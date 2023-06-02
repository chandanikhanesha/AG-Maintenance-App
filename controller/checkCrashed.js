const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const USERNAME = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const { sendEmail } = require("../sendEmail");
const pathToAttachment = `${__dirname}/../crashedReport/crashed.json`;
const attachment = fs.readFileSync(pathToAttachment).toString("base64");

const checkCrashed = async (req, res) => {
  // req.body.orgName = "WIENS FARMS";
  console.log("started");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });
  const URL = process.env.URL;
  let allData = [];

  // const pendingXHR = new PendingXHR(page);
  let listOrgLength = 0;
  let currentIndex = 0;
  if (!req.body.orgName) {
    while (currentIndex <= listOrgLength) {
      await login(currentIndex);
    }
  } else {
    await login(null, req.body.orgName);
  }

  async function login(index, selectedorgName) {
    try {
      await page.goto(`${URL}/log_in`);
      await page.waitForTimeout(1000);

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
      if (listOrg[index]) {
        await listOrg[index].click();
        await page.waitForTimeout(1000);

        // const orgName = await (
        //   await listOrg[index].getProperty("innerText")
        // ).jsonValue();

        listOrgLength = listOrg.length;
        currentIndex++;

        await page.evaluate(() => {
          document.getElementById("orgSubmit").click();
        });
        await page.waitForTimeout(2000);
        const orgName = await page.evaluate(() => {
          const json = localStorage.getItem("reduxPersist:organizationReducer");
          return JSON.parse(json).name;
        });

        const orgId = await page.evaluate(() => {
          const json = localStorage.getItem("reduxPersist:organizationReducer");
          return JSON.parse(json).id;
        });
        console.log("loaded", `${orgName} - ${orgId}`);
        await page.waitForTimeout(1000);

        await page.goto(`${URL}/app/customers`, {
          waitUntil: ["domcontentloaded", "networkidle0"],
        });

        await page.waitForTimeout(1000);
        // await page.click("#customerDot");
        // await page.waitForTimeout(3000);
        // await page.click("#seedWareHouseReport");
        // await page.waitForTimeout(1500);

        // const Bayererror = await page.evaluate(() => {
        //   const d = document.getElementById("bayer-order-preview");
        //   return d;
        // });

        // if (Bayererror === null) {
        //   allData.push({
        //     orgId: orgId,
        //     orgName: orgName,
        //     customerId: "-",
        //     poID: "-",
        //     tab: "SeedWareHouse Report",
        //   });
        // }

        // await page.waitForTimeout(2000);
        // await page.goto(`${URL}/app/reports/growerOrder_report`, {
        //   waitUntil: ["domcontentloaded", "networkidle0"],
        // });
        // await page.waitForTimeout(2000);

        // const GrowerError = await page.evaluate(() => {
        //   const d = document.getElementById("growerOrderReport");
        //   return d;
        // });

        // if (GrowerError === null) {
        //   allData.push({
        //     orgId: orgId,
        //     orgName: orgName,
        //     customerId: "-",
        //     poID: "-",
        //     tab: "GrowerOrderReport under Report navigation ",
        //   });
        // }
        await page.waitForTimeout(2000);
        await page.goto(`${URL}/app/reports/inventory_report`, {
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
        await page.waitForTimeout(1000);

        const InventoryError = await page.evaluate(() => {
          const d = document.getElementById("generateTable");
          return d;
        });

        if (InventoryError === null) {
          allData.push({
            orgId: orgId,
            orgName: orgName,
            customerId: "-",
            poID: "-",
            tab: "InventoryReport under Report navigation ",
          });
        }

        await page.waitForTimeout(2000);
        await page.goto(`${URL}/app/reports/profit_report`, {
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
        await page.waitForTimeout(1000);

        const profitReportError = await page.evaluate(() => {
          const d = document.getElementById("generateTable");
          return d;
        });

        if (profitReportError === null) {
          allData.push({
            orgId: orgId,
            orgName: orgName,
            customerId: "-",
            poID: "-",
            tab: "profitReport ",
            type: "Error at profitReport  under Report navigation",
          });
        }

        await page.waitForTimeout(2000);

        await page.goto(`${URL}/app/reports/customer_report`, {
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
        await page.waitForTimeout(1000);

        const customerError = await page.evaluate(() => {
          const d = document.getElementById("customerTable");
          return d;
        });

        if (customerError === null) {
          allData.push({
            orgId: orgId,
            orgName: orgName,
            customerId: "-",
            poID: "-",
            tab: "CustomerReport",
            type: "Error at CustomerReport  under Report navigation",
          });
        }

        await page.waitForTimeout(2000);
        await page.goto(`${URL}/app/customers`, {
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
        // All customer Product Data
        console.log("👉 Start Custmores Po & quotes & invoice preview");

        const customersData = await page.evaluate(() => {
          const json = localStorage.getItem("AllCustomersData");
          return JSON.parse(json);
        });

        const Allcustomers = customersData.customersdata;
        console.log(Allcustomers.length, "Allcustomers");
        await page.waitForTimeout(2000);
        if (Allcustomers.length > 0) {
          for (let i = 0; i < Allcustomers.length; i++) {
            const custId = Allcustomers[i].id;
            const typeCust =
              Allcustomers[i].name == "Bayer Dealer Bucket"
                ? "dealers"
                : "customers";
            if (custId) {
              for (
                let j = 0;
                j < Allcustomers[i]["PurchaseOrders"].length;
                j++
              ) {
                const poID = Allcustomers[i]["PurchaseOrders"][j].id;

                if (poID) {
                  try {
                    const isQuote =
                      Allcustomers[i]["PurchaseOrders"][j]["isQuote"];
                    const isSimple =
                      Allcustomers[i]["PurchaseOrders"][j]["isSimple"];
                    await page.goto(
                      `${URL}/app/${typeCust}/${custId}/${
                        isQuote ? "quote" : "purchase_order"
                      }/${poID}`,
                      {
                        waitUntil: ["domcontentloaded", "networkidle0"],
                        timeout: 0,
                      }
                    );
                    const error = await page.evaluate(() => {
                      const d =
                        document.getElementById("PO_product") &&
                        document.getElementById("PO_product").innerText;
                      return d;
                    });
                    console.log(error, "Not Crashed");
                    if (error === null) {
                      allData.push({
                        orgId: orgId,
                        orgName: orgName,
                        customerId: custId,
                        poID: poID,
                        tab: "Product",
                        type: "Page Crashed",
                      });
                      console.log(
                        `❌ Page crashed for ${custId} customerId &  ${poID} poID  `
                      );
                    }

                    if (isQuote) {
                      await page.waitForTimeout(2000);

                      await page.goto(
                        `${URL}/app/${typeCust}/${custId}/preview/${poID}`,
                        {
                          waitUntil: ["domcontentloaded", "networkidle0"],
                          timeout: 0,
                        }
                      );
                      await page.waitForTimeout(2000);

                      const error2 = await page.evaluate(() => {
                        const d = document.getElementById("invoice-page");
                        return d;
                      });

                      if (error2 === null) {
                        allData.push({
                          orgId: orgId,
                          orgName: orgName,
                          customerId: custId,
                          poID: poID,
                          tab: "Invoice Preview",
                          type: "Page Crashed",
                        });
                        console.log(
                          `❌ Invoice Page crashed for ${custId} customerId &  ${poID} poID  `
                        );
                      }
                    } else {
                      await page.waitForTimeout(2000);

                      await page.goto(
                        `${URL}/app/${typeCust}/${custId}/${
                          isQuote ? "quote" : "purchase_order"
                        }/${poID}?selectedTabIndex=1`,
                        {
                          waitUntil: ["domcontentloaded", "networkidle0"],
                          timeout: 0,
                        }
                      );
                      await page.waitForTimeout(2000);

                      const paymentTabError = await page.evaluate(() => {
                        const d =
                          document.getElementById("paymentTab") &&
                          document.getElementById("paymentTab");
                        return d;
                      });
                      if (paymentTabError == null) {
                        allData.push({
                          orgId: orgId,
                          orgName: orgName,
                          customerId: custId,
                          poID: poID,
                          tab: "Payment Tab",
                          type: "Page Crashed",
                        });
                        console.log(
                          `❌ Page crashed for PaymentTab ${custId} customerId &  ${poID} poID  `
                        );
                      } else {
                        await page.waitForTimeout(2000);

                        await page.click("#addPayment2");

                        const paymentDialog = await page.evaluate(() => {
                          const d = document.getElementById("closePayment");
                          return d;
                        });
                        if (paymentDialog == null) {
                          allData.push({
                            orgId: orgId,
                            orgName: orgName,
                            customerId: custId,
                            poID: poID,
                            tab: "Payment Tab",
                            type: "Page Crashed in paymentDialog ",
                          });
                          console.log(
                            `❌ Page crashed for paymentDialog ${custId} customerId &  ${poID} poID  `
                          );
                        }
                        await page.waitForTimeout(2000);
                      }

                      await page.goto(
                        `${URL}/app/${typeCust}/${custId}/preview/${poID}`,
                        {
                          waitUntil: ["domcontentloaded", "networkidle0"],
                          timeout: 0,
                        }
                      );
                      const error2 = await page.evaluate(() => {
                        const d = document.getElementById("invoice-page");
                        return d;
                      });
                      await page.waitForTimeout(2000);

                      if (error2 === null) {
                        allData.push({
                          orgId: orgId,
                          orgName: orgName,
                          customerId: custId,
                          poID: poID,
                          tab: "Invoice Preview",
                          type: "Page Crashed",
                        });
                        console.log(
                          `❌ Invoice Page crashed for ${custId} customerId &  ${poID} poID  `
                        );
                      }

                      await page.goto(
                        `${URL}/app/${typeCust}/${custId}/purchase_order/${poID}/deliveries?selectedTabIndex=3`,
                        {
                          waitUntil: ["domcontentloaded", "networkidle0"],
                          timeout: 0,
                        }
                      );
                      await page.waitForTimeout(2000);

                      const error3 = await page.evaluate(() => {
                        const d = document.getElementById("delivery_container");
                        return d;
                      });

                      if (error3 === null) {
                        allData.push({
                          orgId: orgId,
                          orgName: orgName,
                          customerId: custId,
                          poID: poID,
                          tab: "Grower delivery",
                          type: "Page Crashed",
                        });
                        console.log(
                          `❌ Grower delivery Page crashed for ${custId} customerId &  ${poID} poID  `
                        );
                      }
                      await page.goto(
                        `${URL}/app/${typeCust}/${custId}/purchase_order/${poID}/deliveries?selectedTabIndex=4`,
                        {
                          waitUntil: ["domcontentloaded", "networkidle0"],
                          timeout: 0,
                        }
                      );
                      await page.waitForTimeout(2000);

                      const error4 = await page.evaluate(() => {
                        const d = document.getElementById("delivery_container");
                        return d;
                      });

                      if (error4 === null) {
                        allData.push({
                          orgId: orgId,
                          orgName: orgName,
                          customerId: custId,
                          poID: poID,
                          tab: "Grower delivery Return",
                          type: "Page Crashed",
                        });
                        console.log(
                          `❌ Grower delivery Return Page crashed for ${custId} customerId &  ${poID} poID  `
                        );
                      }
                      await page.waitForTimeout(1000);
                    }
                  } catch (error) {
                    console.log("poID " + poID, error);
                  }
                } else console.log("no poID found");
              }
            } else console.log("no customer found");
          }
        }

        console.log("Done Custmores Po & quotes & invoice preview 😀 ");

        const ApiData = await page.evaluate(() => {
          const json = localStorage.getItem(
            "reduxPersist:apiSeedCompanyReducer"
          );
          return JSON.parse(json);
        });
        await page.waitForTimeout(500);

        const ApiID = ApiData.apiSeedCompanies[0]
          ? ApiData.apiSeedCompanies[0].id
          : null;
        await page.goto(
          `${URL}/app/pp_api_seed_companies/${ApiID}?selectedTab=${0}`,
          {
            waitUntil: ["domcontentloaded", "networkidle0"],
          }
        );
        if (ApiID !== null) {
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

            await page.click(`#${cornType}`);

            await page.waitForTimeout(8000);

            const error = await page.evaluate(() => {
              const d = document.getElementById("priceSheet");
              return d;
            });
            const card = await page.evaluate(() => {
              const d = document.getElementById("priceSheet_card");
              return d;
            });

            if (card === null && error === null) {
              console.log(
                `❌ Page crashed in DealerOrderDetailed APIID ${ApiID} and tab = ${i}`
              );
              allData.push({
                orgId: orgId,
                orgName: orgName,
                customerId: "-",
                poID: "-",
                tab: `pp_api_seed_companies-${i}`,
                type: "Page Crashed",
              });
            } else if (error === null && card !== null) {
              allData.push({
                orgId: orgId,
                orgName: orgName,
                customerId: "-",
                poID: "-",
                tab: `pp_api_seed_companies-${i}`,
                type: "Product Not Found / Product Loading",
              });
            }
            await page.waitForTimeout(100);
            console.log(`price sheet /selected tab- ${i}`);
          }
          await page.waitForTimeout(2000);

          await page.goto(
            `${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${0}`,
            {
              waitUntil: ["domcontentloaded", "networkidle0"],
            }
          );
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
            try {
              await page.click(`#${cornType}`);

              await page.waitForTimeout(10000);

              const error = await page.evaluate(() => {
                const d = document.getElementById("Dealer_details");
                return d;
              });

              const card = await page.evaluate(() => {
                const d = document.getElementById("dealer_detail_card");
                return d;
              });

              if (card === null && error === null) {
                console.log(
                  `❌ Page crashed in DealerOrderDetailed APIID ${ApiID} and tab = ${i}`
                );
                allData.push({
                  orgId: orgId,
                  orgName: orgName,
                  customerId: "-",
                  poID: "-",
                  tab: `d_api_seed_companies-${i}`,
                  type: "Page Crashed",
                });
              } else if (error === null && card !== null) {
                allData.push({
                  orgId: orgId,
                  orgName: orgName,
                  customerId: "-",
                  poID: "-",
                  tab: `d_api_seed_companies-${i}`,
                  type: "Product Not Found / Product Loading",
                });
              }

              if (error !== null) {
                await page.waitForTimeout(3000);
                console.log("helllo product Infor");
                await page.evaluate(() => {
                  document.getElementsByName("dealerAction")[0].click();
                });

                await page.click("#bayerPO");
                await page.waitForTimeout(2000);
                const productInfo = await page.evaluate(() => {
                  const d = document.getElementById("productInfo");
                  return d;
                });

                if (productInfo === null) {
                  console.log("po info crahsed");
                  allData.push({
                    orgId: orgId,
                    orgName: orgName,
                    customerId: "-",
                    poID: "-",
                    tab: `d_api_seed_companies-${i}`,
                    type: "PurchaseOrder Info Crashed",
                  });
                } else {
                  await page.click("#swapProduct");
                  await page.waitForTimeout(1000);

                  const isSwapContainer = await page.evaluate(() => {
                    const d = document.getElementById("swapProductContainer");
                    return d;
                  });

                  if (isSwapContainer === null) {
                    allData.push({
                      orgId: orgId,
                      orgName: orgName,
                      customerId: "-",
                      poID: "-",
                      tab: `d_api_seed_companies-${i}`,
                      type: "swap Product page is crashed",
                    });
                  }
                }
              }
            } catch (e) {
              console.log(e, "ee");
            }
            await page.waitForTimeout(1000);
            console.log(`Dealer Order Deatailed/selected tab- ${i}`);
          }

          await page.goto(`${URL}/app/g_api_seed_companies/${ApiID}`, {
            waitUntil: ["domcontentloaded", "networkidle0"],
          });

          const card = await page.evaluate(() => {
            const d = document.getElementById("grouped_detail_card");
            return d;
          });
          if (card === null) {
            console.log(`❌ Page crashed in GroupDetailPage APIID ${ApiID} `);
            allData.push({
              orgId: orgId,
              orgName: orgName,
              customerId: "-",
              poID: "-",
              tab: `g_api_seed_companies`,
              type: "Page Crashed",
            });
          } else {
            allData.push({
              orgId: orgId,
              orgName: orgName,
              customerId: "-",
              poID: "-",
              tab: `g_api_seed_companies`,
              type: "Product Not Found / Product Loading",
            });
          }

          const dealerInputQty = await page.evaluate(() => {
            const d = document.getElementById("dealerInputQty");
            return d;
          });
          if (dealerInputQty !== null) {
            await page.click("#fillAllShort");
            await page.waitForTimeout(2000);
            await page.type("#dealerInputQty", "85", { delay: 50 });
            await page.waitForTimeout(1000);

            await page.click("#syncBayer");
            await page.waitForTimeout(4000);
          }
        } else {
          console.log("No BayerCompany found");
        }

        // all seed company data
        const seedCompanyData = await page.evaluate(() => {
          const json = localStorage.getItem("reduxPersist:seedCompanyReducer");
          return JSON.parse(json);
        });

        const allSeedComopany = seedCompanyData.seedCompanies;
        console.log("👉start seed comapinees");
        for (let i = 0; i < allSeedComopany.length; i++) {
          const seedId = allSeedComopany[i].id;

          let typeArray = [
            ...new Map(
              allSeedComopany[i].Products.map((item) => [
                item["seedType"],
                item,
              ])
            ).values(),
          ];
          for (let i = 0; i < typeArray.length; i++) {
            if (seedId) {
              try {
                if (typeArray.length > 0) {
                  await page.goto(
                    `${URL}/app/seed_companies/${seedId}?selectedTab=${i}`,
                    {
                      waitUntil: ["domcontentloaded", "networkidle0"],
                    }
                  );
                  await page.waitForTimeout(3000);
                  const card = await page.evaluate(() => {
                    const d = document.getElementById("nonBayer_table");
                    return d;
                  });

                  if (card === null) {
                    console.log(
                      `❌ Page crashed in seed_companies seedId ${seedId} and tab = ${i}`
                    );
                    allData.push({
                      orgId: orgId,
                      orgName: orgName,
                      customerId: "-",
                      poID: "-",
                      tab: `seed_companies-seedId-${seedId}-Tab${i}`,
                      type: "Page Crashed",
                    });
                  }
                } else {
                  console.log("No Product Found");
                }
              } catch (error) {
                console.log("poID " + seedId, error);
              }
            } else console.log("no seed Company found");
          }
        }
        console.log("Done seed comapinees 👍");

        //all normal company data
        console.log("👉 start Normal company");
        const CompanyData = await page.evaluate(() => {
          const json = localStorage.getItem("reduxPersist:companyReducer");
          return JSON.parse(json);
        });

        const allCompany = CompanyData.companies;

        for (let i = 0; i < allCompany.length; i++) {
          const Id = allCompany[i].id;
          if (Id) {
            try {
              await page.goto(`${URL}/app/companies/${Id}`, {
                waitUntil: ["domcontentloaded", "networkidle0"],
              });
              await page.waitForTimeout(3000);
              const card = await page.evaluate(() => {
                const d = document.getElementById("nonBayer_table");
                return d;
              });

              if (card === null) {
                console.log(
                  `❌ Page crashed in companies Id ${Id} and tab = ${i}`
                );
                allData.push({
                  orgId: orgId,
                  orgName: orgName,
                  customerId: "-",
                  poID: "-",
                  tab: `companies-Id-${Id}-Tab${i}`,
                  type: "Page Crashed",
                });
              }
            } catch (error) {
              console.log("poID " + Id, error);
            }
          } else console.log("no  Company found");
        }
        console.log("Done Normal company 👍 ");

        //check discount creator page

        await page.goto(`${URL}/app/setting/discount_editor/create`, {
          waitUntil: ["domcontentloaded"],
        });
        await page.waitForTimeout(2000);

        const discountpage = await page.evaluate(() => {
          const d = document.getElementById("discountCreator");
          return d;
        });
        if (discountpage === null) {
          console.log(`❌ Page crashed in discountCreator `);
          allData.push({
            orgId: orgId,
            orgName: orgName,
            customerId: "-",
            poID: "-",
            tab: `discountCreator`,
            type: "Page Crashed",
          });
        }

        //check discount package page
        await page.goto(`${URL}/app/discount_packages/create`, {
          waitUntil: ["domcontentloaded"],
        });
        await page.waitForTimeout(2000);

        const discountPackagepage = await page.evaluate(() => {
          const d = document.getElementById("discountPackage");
          return d;
        });
        if (discountPackagepage === null) {
          console.log(`❌ Page crashed in discount_packages `);
          allData.push({
            orgId: orgId,
            orgName: orgName,
            customerId: "-",
            poID: "-",
            tab: `discount_packages`,
            type: "Page Crashed",
          });
        }

        // await page.goto(`${URL}/app/reports/ship-notice`, {
        //   waitUntil: ["domcontentloaded"],
        // });

        await page.goto(`${URL}/app/customers`, {
          waitUntil: ["domcontentloaded"],
        });
        await page.evaluate(() => localStorage.clear());

        console.log("👍Done", orgName);
      }
    } catch (error) {
      console.log("error", error);
      currentIndex++;

      return res.status(500).json({ success: "False" });
    }
  }

  await page.evaluate(() => localStorage.clear());
  fs.writeFileSync(
    path.join(__dirname, "../crashedReport/crashed.json"),
    JSON.stringify(allData)
  );
  await browser.close();
  return res.status(200).json({ success: "Done" });
};

const getCrashedReport = async (req, res) => {
  const crashedReport = fs.readFileSync(
    path.join(__dirname, "../crashedReport/crashed.json"),
    { encoding: "utf8" }
  );

  if (crashedReport !== "[]" && crashedReport.length !== 0) {
    await sendEmail(
      "dev@agridealer.co",
      "Crashed Purchase Order Report",
      "Crashed Report",
      null,
      [
        {
          content: attachment,
          filename: "crashed.json",
          type: "application/json",
          disposition: "attachment",
        },
      ]
    );
  }
  res.render("crashedReport", {
    data: JSON.parse(crashedReport),
  });
};
module.exports = { checkCrashed, getCrashedReport };
