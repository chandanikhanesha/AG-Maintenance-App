const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const USERNAME = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const BAYER_USERNAME = process.env.BAYER_USERNAME;
const BAYER_PASSWORD = process.env.BAYER_PASSWORD;
const BAYER_GLN_ID = process.env.BAYER_GLN_ID;
const URL = process.env.URL;
const BAYER_TECHID = process.env.BAYER_TECHID;
const APIURL = process.env.APIURL;
const { client } = require("./connection");

const os = require("os");
let storeResponse = [];
const csvParser = require("csv-parser");

const homedir = os.homedir();

const HardCodeTest = async (req, res) => {
  await fs.writeFileSync(
    path.join(__dirname, "../crashedReport/hardCodeTestError.json"),
    JSON.stringify([])
  );
  console.log("started");
  // req.body.orgName = "BAR DOUBLE DIAMOND SEED";
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1900, height: 900 });

  try {
    await page.goto(`${URL}/log_in`);
    await page.waitForTimeout(1000);

    await page.type("#email", USERNAME, { delay: 50 });
    await page.type("#password", PASSWORD, { delay: 50 });

    await page.click('[type="submit"]');

    await page.on("response", async (response) => {
      if (response.url() == `${APIURL}/api/auth/sign_in`) {
        console.log("XHR response received");
        const data = await response.json();
        data.success === false &&
          storeResponse.push({
            error: data.message,
          });
      }
    });
    await page.waitForTimeout(2000);

    await page.goto(`${URL}/app/customers`, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });
    await page.waitForTimeout(1000);

    // bayer connectivity
    await bayerConnectivity(page);
    await createSeedCompany(page);
    await page.waitForTimeout(1000);

    await createRegularCompany(page);

    await page.waitForTimeout(8000);
    await createDiscounts(
      page,
      "perBag",
      "wholeOrder",
      "earlyPayInDollar",
      "earlyPayInPercentage",
      "QuanityDiscount"
    );
    await page.waitForTimeout(3000);

    // create Customers
    await createCustomer(page);
    // create Simple purchaseOrder
    await createSimpleOrder(page, "#createPO", "#addPo", "testPO");
    await page.waitForTimeout(3000);
    await addPayment(page, "simple");
    // create a product for PO
    await createProduct(page, "first");

    await page.click("#selectPOforsync");
    await page.waitForTimeout(2000);

    await page.click("#syncwithbayer");
    await page.waitForTimeout(8000);
    // add dealer to dealer transfer
    await addPayment(page, "simple");
    await page.waitForTimeout(3000);

    // await dealerTransferBayer(page);
    await page.waitForTimeout(3000);

    await createSimpleOrder(page, "#createPO", "#addPo", "deliveryTest");

    // // create a product for PO
    await createProduct(page);
    await page.click("#selectPOforsync");
    await page.waitForTimeout(2000);

    await page.click("#syncwithbayer");
    await page.waitForTimeout(20000);
    await page.evaluate(() => {
      location.reload(true);
    });
    await page.waitForTimeout(3000);

    await addDelivery(page);

    await page.evaluate(() => {
      document.getElementById("Products").click();
    });
    await page.waitForTimeout(1000);

    await createSeedroduct(page);
    await page.waitForTimeout(4000);
    await createRegularProduct(page);
    await page.waitForTimeout(1000);

    await checkReplantFeatures(page);
    await page.waitForTimeout(1000);
    await checkDeliveries(page);
    await page.waitForTimeout(1000);
    // create advancePO purchaseOrder
    await createAdvanceOrder(page, "#createPO", "#addPo", "AdvancetestPO");
    await page.waitForTimeout(2000);

    // await addPayment(page, "advance");

    // create simple quote
    await page.goto(`${URL}/app/customers`, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });
    await createSimpleOrder(
      page,
      "#createQuote",
      "#addQuote",
      "testSimpleQuote"
    );
    await page.waitForTimeout(5000);

    //create product for quote
    await createProduct(page);
    await page.waitForTimeout(5000);

    await createSeedroduct(page);
    await page.waitForTimeout(5000);

    await createRegularProduct(page);

    await page.waitForTimeout(3000);

    await convertIntoPO(page);
    // create advance quote
    await checkSwitchFarm(page);
    await page.waitForTimeout(3000);
    await unarchivedCustomer(page);

    await createAdvanceOrder(
      page,
      "#createQuote",
      "#addQuote",
      "AdvancetestQuote"
    );

    //create discount packages
    await createDiscountPackage(page);

    // //synce ship notice
    await syncShipNotice(page);
    // transfer grower to grower
    await growerTransfer(page);
    //trab=nsfer with product change
    await growerTransferWithChangeProduct(page);

    // convert simple to advance
    await convertIntoAdvance(page);

    //await download csv
    await dowanloadCsv(page);

    //add pick later option to advance order and create product into it

    await createPickLaterAdvanceOrder(
      page,
      "#createPO",
      "#addPo",
      "pickLaterTest"
    );

    //Add all calculation and check with hard code response
    await checkDiscountCalculationEarlyPay(page);
    await page.waitForTimeout(2000);

    await checkDiscountCalculation(page);
    await page.waitForTimeout(2000);
    await checkComplexDiscount(page);
    await page.waitForTimeout(3000);

    await customerSeedWarehouseReport(page);
    await page.waitForTimeout(3000);

    await detailSeedWarehouseReport(page);
    await page.waitForTimeout(3000);
    await deletePOAndProduct(page);
    await page.goto(`${URL}/app/customers`, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    await page.click("#customerDot");
    await page.waitForTimeout(3000);

    await page.click("#dowanloadCust");
    await page.waitForTimeout(3000);
    await page.click("#downloadCsv");

    await page.waitForTimeout(1000);

    // get all customer report and get that file data and compare with hard code calculation
    // await page.goto(`${URL}/app/customers`, {
    //   waitUntil: ["domcontentloaded", "networkidle0"],
    // });
    // await page.click("#customerDot");
    // await page.waitForTimeout(3000);

    // await page.click("#downloadDisReport");

    // await page.waitForTimeout(1000);

    // const path = `${homedir}/Downloads/discountReport-1.csv`;

    // await fs
    //   .createReadStream(path)
    //   .on("error", (err) => {
    //     console.log(err);
    //     // handle error
    //   })

    //   .pipe(csvParser())
    //   .on("data", async (row) => {
    //     console.log(row, "row");
    //     if (
    //       row.preTotal === "3760" ||
    //       "4075" ||
    //       "1880" ||
    //       "5955" ||
    //       "15040" ||
    //       "7520"
    //     ) {
    //       console.log("preTotal match with calculation");
    //     } else {
    //       storeResponse.push({
    //         error: `early pay bothUnitCase2 Discount Total not match with our calculation`,
    //       });
    //       console.log("Not match preTotal with our hardCode calculations");
    //     }
    //     if (row.DiscountTotal === "0" || "100" || "1418" || "476") {
    //       console.log("DiscountTotal match with calculation");
    //     } else {
    //       storeResponse.push({
    //         error: `Not match DiscountTotal with our hardCode calculations`,
    //       });
    //       console.log("not match DiscountTotal");
    //     }

    //     // use row data
    //   });

    await checkBalanceDueModel(page);
    await page.waitForTimeout(2000);

    // await checkSeedWareHouse(page);
    // await page.waitForTimeout(2000);

    await importCustomer(page);
    await checkimportdealerTransfer(page);
    await page.waitForTimeout(1000);
    await checkCustomerReport(page);
    await page.waitForTimeout(1000);

    await checkgrowerOrderReport(page);
    await page.waitForTimeout(1000);

    await checkInventoryReport(page);
    await page.waitForTimeout(1000);

    await checkProfitReport(page);
    await page.waitForTimeout(2000);
    await checkCustomerDeliveriesField(page);
    await checkInventoryPurchaseOrder(page);
    await page.waitForTimeout(2000);

    await checkGropedDetailPage(page);
    await page.waitForTimeout(1000);
    await checkTempletList(page);
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log("error while hardcode Test", error);
    storeResponse.push({
      error: error.toString(),
    });
  }

  fs.writeFileSync(
    path.join(__dirname, "../crashedReport/hardCodeTestError.json"),
    JSON.stringify(storeResponse)
  );
  const error = fs.readFileSync(
    path.join(__dirname, "../crashedReport/hardCodeTestError.json"),
    { encoding: "utf8" }
  );
  res.render("getError", {
    data: JSON.parse(error),
  });
  await browser.close();
};

const checkReturnProduct = async (page) => {
  await page.evaluate(() => {
    document.getElementById("Return Products").click();
  });

  await page.waitForTimeout(2000);
  const isWork = await page.evaluate(() => {
    return document.getElementById("productActions");
  });
  await page.waitForTimeout(1000);

  if (isWork === null) {
    storeResponse.push({
      error: "ReturnProductPage is not working",
    });
  }
};

const syncShipNotice = async (page) => {
  await page.waitForTimeout(2000);

  const ApiData = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json);
  });
  await page.waitForTimeout(3000);
  const ApiID =
    (ApiData.apiSeedCompanies[0] && ApiData.apiSeedCompanies[0].id) || 20;
  await page.waitForTimeout(3000);
  await page.goto(`${URL}/app/s_api_seed_companies/ship-notice/${ApiID}`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });

  await page.waitForTimeout(5000);

  // await page.click("#syncShipNotice");
  // await page.waitForTimeout(1000);
  await page.evaluate(() => {
    return document.getElementById("selectAllShipNotice").click();
  });
  await page.waitForTimeout(1000);

  await page.click("#acceptShipNotice");
  await page.waitForTimeout(3000);
};

const createDiscounts = async (page, name1, name2, name3, name4, name5) => {
  await page.goto(`${URL}/app/setting/discount_editor/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.type("#name", `${name1}`, { delay: 50 });

  await page.waitForTimeout(1000);

  // await page.click("#applyToSeedType");
  // await page.waitForTimeout(1000);

  await page.click("#bayer");
  await page.waitForTimeout(2000);

  await page.click("#Corn");

  await page.click("#Sorghum");

  await page.click("#Soybean");

  await page.click("#Canola");
  await page.waitForTimeout(2000);

  await page.type("#discountValue", "10", { delay: 50 });
  await page.waitForTimeout(2000);

  await page.click('[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${URL}/app/setting/discount_editor/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.type("#name", `perBag2`, { delay: 50 });

  // await page.click("#applyToSeedType", { delay: 50 });
  await page.click("#bayer");
  await page.waitForTimeout(2000);

  await page.click("#Corn");

  await page.click("#Sorghum");

  await page.click("#Soybean");

  await page.click("#Canola");
  await page.type("#discountValue", "10", { delay: 50 });
  await page.waitForTimeout(2000);

  await page.click('[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${URL}/app/setting/discount_editor/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.type("#name", `${name2}`, { delay: 50 });

  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("wholeOrder").click();
  });

  await page.waitForTimeout(2000);

  // await page.click("#applyToSeedType", { delay: 50 });

  await page.type("#discountValue", "10", { delay: 50 });
  await page.waitForTimeout(2000);

  await page.click('[type="submit"]');
  await page.waitForTimeout(2000);
  await page.goto(`${URL}/app/setting/discount_editor/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.type("#name", `${name3}`, { delay: 50 });

  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    document.getElementById("earlyPay").click();
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.getElementById("perBag").click();
  });

  await page.waitForTimeout(2000);

  // await page.click("#applyToSeedType", { delay: 50 });
  await page.waitForTimeout(2000);
  await page.click("#bayer");
  await page.waitForTimeout(2000);

  await page.click("#Corn");

  await page.click("#Sorghum");

  await page.click("#Soybean");

  await page.click("#Canola");
  await page.waitForTimeout(2000);

  await page.click("#earlyPayExpiryDate");
  await page.waitForTimeout(2000);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);

  await page.type("#discountValue", "10", { delay: 50 });
  await page.waitForTimeout(2000);

  await page.click('[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${URL}/app/setting/discount_editor/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.type("#name", `${name4}`, { delay: 50 });

  await page.click("#expiryDate");
  await page.waitForTimeout(2000);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    document.getElementById("earlyPay").click();
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.getElementById("perBag").click();
  });

  await page.waitForTimeout(2000);

  // await page.click("#applyToSeedType", { delay: 50 });
  await page.waitForTimeout(2000);
  await page.click("#bayer");
  await page.waitForTimeout(2000);

  await page.click("#Corn");

  await page.click("#Sorghum");

  await page.click("#Soybean");

  await page.click("#Canola");
  await page.waitForTimeout(2000);

  await page.click("#earlyPayExpiryDate");
  await page.waitForTimeout(2000);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(1000);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);

  await page.type("#discountValue", "10", { delay: 50 });
  await page.waitForTimeout(2000);
  await page.click('[class="MuiSelect-nativeInput"]');
  await page.waitForTimeout(2000);
  await page.click('[data-value="%"]');
  await page.waitForTimeout(2000);

  await page.click('[type="submit"]');
  await page.waitForTimeout(2000);

  await page.goto(`${URL}/app/setting/discount_editor/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.type("#name", `${name5 || "QuanityDiscount"}`, { delay: 50 });
  await page.click("#expiryDate");
  await page.waitForTimeout(2000);

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(1000);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    document.getElementById("qtyDiscount").click();
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.getElementById("perBag").click();
  });

  await page.waitForTimeout(2000);

  // await page.click("#applyToSeedType", { delay: 50 });
  await page.waitForTimeout(2000);
  await page.click("#bayer");
  await page.waitForTimeout(2000);

  await page.click("#Corn");

  await page.click("#Sorghum");

  await page.click("#Soybean");

  await page.click("#Canola");
  await page.waitForTimeout(2000);

  await page.click("#minqty");
  await page.type("#minqty", "1", { delay: 50 });

  await page.click("#minqty");
  await page.type("#minqty", "20", { delay: 50 });

  await page.type("#discountValue", "10", { delay: 50 });
  await page.waitForTimeout(2000);

  await page.click('[type="submit"]');
  await page.waitForTimeout(2000);
};

const createCustomer = async (page, name) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");
  await page.waitForTimeout(1000);

  await page.click("#createCustomer");

  await page.waitForTimeout(500);

  await page.type("#name", name ? name : "test", { delay: 90 });
  await page.waitForTimeout(1000);

  await page.click("#viewCustomer");
  await page.waitForTimeout(2000);

  await page.click(name ? `#${name}` : "#test");
  await page.waitForTimeout(2000);

  await page.evaluate(
    async () => await document.getElementById("Bayer Licence").click()
  );

  await page.type("#monsantoTechnologyId", BAYER_TECHID, { delay: 50 });

  await page.waitForTimeout(2000);

  await page.click("#connectwithbayer");
  await page.waitForTimeout(5000);

  await page.click("#viewCustomer");
  await page.waitForTimeout(2000);
};

const bayerConnectivity = async (page) => {
  let data;
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

    await page.type("#bayerUserName", BAYER_USERNAME, { delay: 50 });
    await page.type("#bayerPassword", BAYER_PASSWORD, { delay: 50 });
    await page.type("#bayerGlnID", BAYER_GLN_ID, { delay: 50 });
    await page.evaluate(() => {
      document.getElementById("connectWithBayer").click();
    });

    await page.waitForTimeout(5000);
    await page.on("response", async (response) => {
      if (response.url() == `${APIURL}/api/monsanto/grower_licence/check`) {
        console.log("XHR response received");
        data = await response.json();
        data.error &&
          storeResponse.push({
            error: data.error["con:reason"][0],
          });
      }
    });

    await page.waitForTimeout(15000);
    console.log(data && data.licences, "data && data.licences");

    await page.click('[type="submit"]');
    await page.waitForTimeout(3000);
    if (data && data.licences !== undefined) {
      const ApiData = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
        return JSON.parse(json);
      });
      await page.waitForTimeout(1000);
      const ApiID =
        (ApiData.apiSeedCompanies[0] && ApiData.apiSeedCompanies[0].id) || 20;

      //synce dealer deatiled page
      await page.goto(
        `${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${0}`,
        {
          waitUntil: ["domcontentloaded", "networkidle0"],
        }
      );
      await page.waitForTimeout(1000);

      page.click("#dotBtns");
      await page.waitForTimeout(500);
      //click sync latest price sheet option

      await page.click("#syncInventory");

      await page.waitForTimeout(3000);

      //sync latest price sheet

      await page.goto(
        `${URL}/app/pp_api_seed_companies/${ApiID}?selectedTab=${0}`,
        {
          waitUntil: ["domcontentloaded", "networkidle0"],
        }
      );

      await page.waitForTimeout(1000);

      //click on 3 dots in price sheet page
      await page.evaluate(() => {
        document.getElementById("dotBtnsInPriceSheet").click();
      });
      await page.waitForTimeout(500);
      //click sync latest price sheet option
      await page.evaluate(() => {
        document.getElementById("syncLatestPricesheet").click();
      });

      // create seed company
      await page.waitForTimeout(3000);

      await createSeedCompany(page);
      await page.waitForTimeout(5000);

      // create regular company
      await createRegularCompany(page);

      // create discount
    } else {
      await bayerConnectivity(page);
    }
  } else {
    await bayerConnectivity(page);
  }
};

const createSimpleOrder = async (page, createType, orderType, name, cname) => {
  console.log(cname, "cname");
  const custname = cname ? `#${cname}-radio` : "#DiscountCheck-radio";
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");

  await page.waitForTimeout(1000);

  await page.click(createType);
  await page.click(custname);
  await page.waitForTimeout(1000);

  await page.click(orderType);

  await page.waitForTimeout(1000);

  await page.type("#POname", `${name}`, { delay: 90 });
  await page.click("#simplePo");

  await page.waitForTimeout(2000);
  await page.click("#ProceedBtn");

  await page.waitForTimeout(1000);
};

const createPickLaterAdvanceOrder = async (
  page,
  createType,
  orderType,
  name
) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");
  await page.waitForTimeout(1000);

  await page.waitForTimeout(1000);
  await page.click(createType);

  await page.click(orderType);

  await page.waitForTimeout(500);

  await page.type("#POname", `${name}`, { delay: 90 });
  await page.click("#advancePO");

  await page.waitForTimeout(2000);
  await page.click("#ProceedBtn");

  await page.waitForTimeout(4000);
  await page.click("#addFarm");
  await page.type("#farm-name", "testFarm", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#createFarm");
  await page.waitForTimeout(1000);
  await page.click("#farmExpand");
  await page.waitForTimeout(1000);
  await page.click("#openMenuItem");
  await page.waitForTimeout(1000);

  await page.waitForTimeout(1000);
  await createPickLaterProduct(page);
  await page.waitForTimeout(1000);
  await page.waitForTimeout(1000);
};

const createPickLaterProduct = async (page, value, qty) => {
  await page.waitForTimeout(2000);

  await page.click("#addProduct");
  await page.waitForTimeout(2000);
  // create monsanto product with pickLater seedSize and packaging
  await page.click("[data-test-id=companySelect]");
  await page.waitForTimeout(1000);
  await page.click("#apiSeed-Bayer");
  await page.waitForTimeout(2000);

  await page.click("#seedTypeSelect");
  await page.waitForTimeout(1000);

  await page.click("#corn");
  await page.waitForTimeout(1000);

  // await page.click("#showFavProduct");
  await page.waitForTimeout(1000);

  await page.click("#SS-RIB");
  await page.waitForTimeout(500);

  await page.click("#DKC64-34RIB");
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("500 + B300 + Nemastrike + EDC").click();
  });

  await page.waitForTimeout(500);
  await page.click("#PickLater-seedSize");
  await page.waitForTimeout(500);

  await page.click("#PickLater-packaging");
  await page.waitForTimeout(500);
  await page.click("#quantity");
  await page.type("#quantity", "9", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#selectProduct");
  await page.waitForTimeout(2000);
  await page.click("#submitProduct");
  await page.waitForTimeout(4000);
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    return document.getElementById("Pick Later Product").click();
  });

  // await page.click("#Pick Later Product");
  await page.waitForTimeout(2000);
  await page.click("#productActions");
  await page.waitForTimeout(2000);

  await page.click("#manageSeedSize");
  await page.waitForTimeout(2000);

  await page.click("#addSeedSize");
  await page.click("#seedSizeSelect");
  await page.click("#AR2");
  await page.waitForTimeout(2000);

  await page.click("#packagingSelect");
  await page.click("#SP45");

  await page.type("#quantity", "99", { delay: 50 });
  await page.waitForTimeout(2000);

  await page.click("#checkTransfer");
  await page.waitForTimeout(3000);

  await page.click("#selectPOforsync");
  await page.waitForTimeout(1000);

  await page.click("#syncwithbayer");
  await page.waitForTimeout(2000);
  const isPickLaterTable = await page.evaluate(() => {
    const d = document.getElementById("pickLaterTable");
    return d;
  });
  if (isPickLaterTable == null) {
    console.log("pickLater page was crashed");
    storeResponse.push({
      error: "pickLater page was crashed",
    });
  }
};

const createProduct = async (page, value, qty) => {
  await page.waitForTimeout(2000);

  await page.click("#addProduct");
  await page.waitForTimeout(2000);
  // create monsanto product
  await page.click("[data-test-id=companySelect]");
  await page.waitForTimeout(2000);
  await page.click("#apiSeed-Bayer");
  await page.waitForTimeout(2000);

  await page.click("#seedTypeSelect");
  await page.waitForTimeout(1000);

  await page.click("#corn");
  await page.waitForTimeout(1000);

  // await page.click("#showFavProduct");
  await page.waitForTimeout(1000);

  await page.click("#SS-RIB");
  await page.waitForTimeout(500);

  await page.click("#DKC64-34RIB");
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("500 + B300 + Nemastrike + EDC").click();
  });

  await page.waitForTimeout(500);
  await page.click("#AF");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.getElementById("80M").click();
  });
  await page.waitForTimeout(500);
  await page.click("#quantity");
  await page.type("#quantity", "9", { delay: 50 });

  await page.waitForTimeout(2000);

  await page.click("#selectProduct");
  await page.waitForTimeout(1000);
  await page.click("#accordion__heading-b");
  await page.waitForTimeout(1000);
  if (value === "earlyPayInDollar") {
    await page.click("#earlyPayInDollar");
  } else if (value === "earlyPayInPercentage") {
    await page.click("#earlyPayInPercentage");
  } else if (value === "earlyPayBothCase1") {
    await page.click("#earlyPayInDollar");
    await page.waitForTimeout(1000);
    await page.click("#earlyPayInPercentage");
  } else if (value === "earlyPayBothCase2") {
    await page.click("#earlyPayInPercentage");
    await page.waitForTimeout(1000);
    await page.click("#earlyPayInDollar");
  } else {
    if (value === "%") {
      await page.click("#perBag");

      await page.waitForTimeout(1000);
      await page.click("#chooseUnit-perBag");
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        document.getElementById("discount%").click();
      });
    }
  }

  await page.waitForTimeout(1000);
  await page.click("#submitProduct");
  await page.waitForTimeout(1000);
};

const createAdvanceOrder = async (page, createType, orderType, name) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");
  await page.waitForTimeout(1000);

  await page.waitForTimeout(1000);
  await page.click(createType);

  await page.click(orderType);

  await page.waitForTimeout(500);

  await page.type("#POname", `${name}`, { delay: 90 });
  await page.click("#advancePO");

  await page.waitForTimeout(2000);
  await page.click("#ProceedBtn");

  await page.waitForTimeout(4000);
  await page.click("#addFarm");
  await page.waitForTimeout(1500);

  await page.type("#farm-name", "testFarm", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#createFarm");
  await page.waitForTimeout(1000);
  await page.click("#farmExpand");
  await page.waitForTimeout(1000);
  await page.click("#openMenuItem");

  await page.waitForTimeout(1000);
  await createSeedroduct(page);
  await page.waitForTimeout(1000);

  await page.click("#openMenuItem");
  await page.waitForTimeout(1000);
  await page.click("#addShareHolderPer");
  await page.waitForTimeout(1000);

  await createShareHolders(page, "add1ShareHolder", 2);
  await page.waitForTimeout(1000);
  await createShareHolders(page, "add2ShareHolder", 3);
  await page.waitForTimeout(1000);
  await createShareHolders(page, "add3ShareHolder", 4);
  await page.waitForTimeout(1000);
  await createShareHolders(page, "add4ShareHolder", 5);
  await page.waitForTimeout(1000);

  await page.type("#percentage-0", "20", { delay: 50 });
  await page.waitForTimeout(1000);
  await page.click("#savePercent");
  await page.waitForTimeout(1000);
  await page.type("#percentage-1", "10", { delay: 50 });
  await page.waitForTimeout(1000);
  await page.click("#savePercent");
  await page.type("#percentage-2", "30", { delay: 50 });
  await page.waitForTimeout(1000);
  await page.click("#savePercent");
  await page.type("#percentage-3", "20", { delay: 50 });
  await page.waitForTimeout(1000);
  await page.click("#savePercent");
  await page.type("#percentage-4", "20", { delay: 50 });
  await page.waitForTimeout(1000);
  await page.click("#savePercent");
  await page.waitForTimeout(3000);
  await page.click("#save");
  await page.waitForTimeout(1000);
  // await page.evaluate(() => {
  //   document.getElementById("Invoice Preview").click();
  // });
  // await page.waitForTimeout(1000);
  // await page.click("#pdfClick");
  // await page.waitForTimeout(1000);
};

const convertIntoPO = async (page) => {
  await page.waitForTimeout(1000);

  await page.click("#addproductDots");

  await page.waitForTimeout(3000);
  await page.click("#convertToPO");
  await page.waitForTimeout(1000);

  await page.click("#convertQuote");
  await page.waitForTimeout(5000);
};

const convertIntoAdvance = async (page) => {
  await createCustomer(page, "convertPO");
  await page.waitForTimeout(2000);

  await createSimpleOrder(
    page,
    "#createPO",
    "#addPo",
    "ConvertIntoAPO",
    "convertPO"
  );
  await page.waitForTimeout(2000);

  await createProduct(page, 0);
  await page.waitForTimeout(2000);

  let PID = 0;
  let recordValue = 0;
  const query = {
    text: `SELECT id
    FROM public."PurchaseOrders" where name='ConvertIntoAPO';`,
  };

  client.query(query, (err, res) => {
    if (err) {
      console.log("query error", err.stack);
    } else {
      PID = res.rows[0].id;
      const query2 = {
        text: `SELECT "CustomerMonsantoProducts"."purchaseOrderId" ,
        COUNT(*)FROM public."CustomerMonsantoProducts" where "purchaseOrderId"=${PID}
        GROUP BY
          "CustomerMonsantoProducts"."purchaseOrderId";`,
      };

      client.query(query2, (err, res) => {
        if (err) {
          console.log("query error", err.stack);
        } else {
          // console.log(res);

          recordValue = res.rows[0].count;

          console.log(res.rows[0]);
        }
      });
    }
  });

  await page.click("#addproductDots");
  await page.waitForTimeout(1000);
  await page.click("#addproductDots");

  await page.click("#convertToadvance");
  await page.waitForTimeout(1000);

  await page.type("#farm-name", "convertFarm", { delay: 50 });
  await page.type("#field-name", "convertField", { delay: 50 });

  await page.click("#convertAPO");

  await page.waitForTimeout(2000);
  const query2 = {
    text: `SELECT "CustomerMonsantoProducts"."purchaseOrderId" ,
    COUNT(*)FROM public."CustomerMonsantoProducts" where "purchaseOrderId"=${PID}
    GROUP BY
      "CustomerMonsantoProducts"."purchaseOrderId";`,
  };

  client.query(query2, (err, res) => {
    if (err) {
      console.log("query error", err.stack);
    } else {
      // console.log(res);
      console.log(res.rows[0]);
      if (recordValue == res.rows[0].count) {
        console.log("row was not dublicate in convert PO");
      } else {
        storeResponse.push({
          error: "row was  dublicate while do  convert to advance PO",
        });
      }
    }
  });
  await page.waitForTimeout(2000);
};

const createRegularCompanyProduct = async (page) => {
  await page.waitForTimeout(1000);
  await page.click("#regularProductName");

  await page.waitForTimeout(1000);
  await page.type("#regularProductName", "regularProduct", { delay: 50 });
  await page.click("#react-select-2-listbox");
  await page.waitForTimeout(1000);

  await page.click("#productType");

  await page.type("#productType", "regularType", { delay: 50 });
  await page.click("#react-select-3-listbox");
  await page.waitForTimeout(1000);

  await page.click("#productDescription");

  await page.type("#productDescription", "regularDescription", { delay: 50 });
  await page.click("#react-select-4-listbox");
  await page.waitForTimeout(1000);

  await page.type("#customId", "23", { delay: 50 });
  await page.type("#unit", "11", { delay: 50 });
  await page.type("#costUnit", "43", { delay: 50 });

  await page.type("#quantity", "10", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#addNonBayerProduct");
  await page.waitForTimeout(2000);
};
const createRegularCompany = async (page) => {
  //  create regular comoany
  await page.goto(`${URL}/app/companies/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.evaluate(() => {
    document.getElementById("regularCompanyBtn").click();
  });
  await page.waitForTimeout(1000);

  await page.type("#companyName", "regularCompany", { delay: 50 });
  await page.click('[type="submit"]');
  await page.waitForTimeout(3000);
  await page.click("#productAdd");
  await page.waitForTimeout(1000);

  await createRegularCompanyProduct(page);

  const customProductData = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:customProductReducer");
    return JSON.parse(json);
  });

  await page.waitForTimeout(3000);

  const customProductId =
    customProductData &&
    customProductData.products.filter((d) => d.name === "regularProduct")[0].id;
  // ---add your anu fucntionds
  await dealerTransferNonBayerCompanie(page, customProductId, "regular");
  await page.waitForTimeout(3000);
};

const growerTransfer = async (page) => {
  await createCustomer(page, "growerTransfer");
  await createSimpleOrder(page, "#createPO", "#addPo", "transferTestPO");

  await createProduct(page);
  await page.waitForTimeout(2000);

  await page.click("#selectPOforsync");
  await page.waitForTimeout(1000);

  await page.click("#syncwithbayer");
  await page.waitForTimeout(20000);

  await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
  await page.waitForTimeout(1000);

  await page.click("#productActions");
  await page.waitForTimeout(1000);

  await page.click("#editQuantity");

  let searchInput = await page.$("#quantity");
  await page.waitForTimeout(2000);
  await searchInput.click({ clickCount: 3 });
  await searchInput.press("Backspace");
  await page.type("#quantity", "5", { delay: 50 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("VT2P/BR2").click();
  });

  await page.waitForTimeout(500);

  await page.click("#RT6203SHORT");
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("Acceleron500+B300+Enhanced Dis").click();
  });

  await page.waitForTimeout(500);
  await page.click("#AR2");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.getElementById("SP45").click();
  });

  await page.click("#transferWay");
  await page.waitForTimeout(1000);

  await page.click("#toMonsanto");
  await page.waitForTimeout(2000);

  await page.click("#submitProduct");
  await page.waitForTimeout(1000);

  // await page.click("#trasfer_ok");
  // await page.waitForTimeout(3000);
};

const createSeedCompany = async (page) => {
  //  create seed company btn

  await page.goto(`${URL}/app/companies/create`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.evaluate(() => {
    document.getElementById("seedCompanyBtn").click();
  });

  await page.waitForTimeout(1000);

  await page.type("#companyName", "SeedCompany", { delay: 50 });

  await page.click("#addcrop");
  await page.waitForTimeout(1000);
  await page.type("#newCropName", "corn", { delay: 50 });
  await page.click("#cropSave");
  await page.waitForTimeout(1000);

  await page.click("#expander");
  await page.waitForTimeout(1000);

  await page.type("#corn-brand-name", "yummmy", { delay: 50 });
  await page.click('[type="submit"]');
  await page.waitForTimeout(3000);

  await page.click("#productAdd");
  await page.waitForTimeout(1000);

  await page.click("#trait");
  await page.waitForTimeout(1000);

  await page.type("#trait", "seedTrait", { delay: 50 });
  await page.click("#react-select-2-listbox");
  await page.waitForTimeout(1000);
  await page.click("#variety");
  await page.type("#variety", "seedVariety", { delay: 50 });
  await page.click("#react-select-3-listbox");
  await page.waitForTimeout(1000);
  await page.type("#rm", "15.75", { delay: 50 });
  await page.click("#treatment");
  await page.type("#treatment", "seedTreatment", { delay: 50 });
  await page.click("#react-select-4-listbox");

  await page.type("#msrp", "10", { delay: 50 });
  await page.click("#add");

  await page.waitForTimeout(1000);
  const customerProductData = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:productReducer");
    return JSON.parse(json);
  });

  const customerProductId =
    customerProductData && customerProductData.products[0].id;
  await dealerTransferNonBayerCompanie(page, customerProductId);

  //----import csv option
  // await page.waitForTimeout(3000);
  // await page.evaluate(() => {
  //   location.reload(true);
  // });
  // await page.click("#nonBayerBtn");
  // await page.waitForTimeout(1000);
  // const [fileChooser] = await Promise.all([
  //   page.waitForFileChooser(),
  //   await page.click("#importCsvRegularCom"),
  // ]);
  // await fileChooser.accept([
  //   `${homedir}/Downloads/Latest-Fertilizer-Chemical.csv`,
  // ]);
};

const createDiscountPackage = async (page) => {
  await page.goto(`${URL}/app/setting/discount_packages`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#createPackage");
  await page.waitForTimeout(1000);

  await page.type("#disPackageName", "disPackageTest", { delay: 50 });
  await page.waitForTimeout(2000);
  await page.click("#perBag");
  await page.waitForTimeout(1000);

  await page.click('[type="submit"]');
};

const createSeedroduct = async (page) => {
  await page.click("#addProduct");
  await page.waitForTimeout(2000);
  await page.waitForSelector("[data-test-id=companySelect]");
  await page.click("[data-test-id=companySelect]");
  await page.waitForTimeout(2000);
  await page.click("#SeedCompany");
  await page.waitForTimeout(2000);

  await page.click("#seedTypeSelect");
  await page.waitForTimeout(1000);

  await page.click("#yummmy");
  await page.waitForTimeout(1000);
  //choose product
  await page.click("#seedTrait");
  await page.waitForTimeout(500);

  await page.click("#seedVariety");
  await page.waitForTimeout(1000);

  await page.click("#seedTreatment");
  await page.waitForTimeout(500);

  await page.waitForTimeout(500);
  await page.type("#quantity", "5", { delay: 50 });

  await page.waitForTimeout(2000);

  await page.click("#selectProduct");
  await page.waitForTimeout(1000);

  await page.click("#submitProduct");
  await page.waitForTimeout(1000);
};

const createRegularProduct = async (page) => {
  await page.click("#addProduct");

  await page.waitForTimeout(4000);

  await page.click("[data-test-id=companySelect]");
  await page.waitForTimeout(1000);
  await page.click("#regularCompany");
  await page.waitForTimeout(2000);
  await page.click("#regularProduct");
  await page.waitForTimeout(500);

  await page.click("#regularType");
  await page.waitForTimeout(1000);

  await page.click("#regularDescription");
  await page.waitForTimeout(500);

  await page.waitForTimeout(500);
  await page.type("#quantity", "5", { delay: 50 });

  await page.waitForTimeout(2000);

  await page.click("#selectProduct");
  await page.waitForTimeout(1000);

  await page.click("#submitProduct");
  await page.waitForTimeout(1000);
};

const dealerTransferBayer = async (page) => {
  const ApiID = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json).apiSeedCompanies[0].id;
  });

  console.log(ApiID);
  await page.goto(`${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${0}`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });

  await page.waitForTimeout(1000);

  const customersMonsantoData = await page.evaluate(() => {
    const json = localStorage.getItem(
      "reduxPersist:customerMonsantoProductReducer"
    );
    return JSON.parse(json);
  });
  await page.waitForTimeout(3000);

  const customerMonsantoProductId =
    customersMonsantoData &&
    (await customersMonsantoData.customerMonsantoProducts[0].monsantoProductId);

  console.log(customerMonsantoProductId, "customerMonsantoProductId");
  await page.waitForTimeout(1000);

  if (customerMonsantoProductId) {
    await page.waitForTimeout(1000);

    await page.click(`#productId-${"16156"}`);
    await page.waitForTimeout(1000);

    await page.click("#dealerTransfer");
    await page.click("#addDealer");
    await page.click("#addDealer2");
    await page.type("#name", "testDealer", { delay: 50 });
    await page.type("#notes", "notes", { delay: 50 });
    await page.type("#phone", "phone", { delay: 50 });
    await page.type("#email", "email@gmail.com", { delay: 50 });

    await page.click("#dealerCheck");
    await page.waitForTimeout(1000);

    await page.click("#closeDealer");

    await page.click("#addTransfer");
    await page.type("#lot-number", "testLot", { delay: 50 });
    // await page.click("#dealerId");
    // await page.click("#testDealer");
    await page.type("#quantity", "10", { delay: 50 });
    await page.waitForTimeout(500);

    await page.click("#checkTransfer");
    await page.waitForTimeout(1000);

    await page.click("#close");
    await page.waitForTimeout(1000);

    // add return
    await page.click(`#productId-${16156}`);
    await page.waitForTimeout(1000);

    await page.click("#dealerReceived");
    await page.waitForTimeout(1000);

    await page.click("#addReturn");
    await page.click("#chooseLot");
    await page.click("#testLot");
    await page.type("#quantity", "10", { delay: 50 });
    await page.type("#netWeight", "10LBM", { delay: 50 });
    await page.waitForTimeout(500);

    await page.click("#checkReturn");
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      location.reload(true);
    });
    await page.waitForTimeout(2000);

    await checkSearchbar(page);
    await page.waitForTimeout(1000);
    await checkSort(page);
    await page.waitForTimeout(1000);

    await page.goto(
      `${URL}/app/pp_api_seed_companies/${ApiID}?selectedTab=${0}`,
      {
        waitUntil: ["domcontentloaded", "networkidle0"],
      }
    );
    await page.waitForTimeout(2000);

    await page.click("#StarIcon");
    await page.waitForTimeout(2000);
  } else {
    await dealerTransferBayer(page);
  }
};

const dealerTransferNonBayerCompanie = async (page, id, type) => {
  await page.waitForTimeout(1000);

  await page.click(`#productId-${id}`);
  await page.click("#nonBayerTransfer");

  await page.click("#addDealer");
  await page.click("#addDealer2");
  await page.type("#name", "testDealer", { delay: 50 });
  await page.type("#notes", "notes", { delay: 50 });
  await page.type("#phone", "phone", { delay: 50 });
  await page.type("#email", "email@gmail.com", { delay: 50 });

  await page.click("#dealerCheck");
  await page.waitForTimeout(1000);

  await page.click("#closeDealer");
  await page.click("#addTransfer");
  await page.type("#lot-number", "testLot", { delay: 50 });
  await page.type("#quantity", "10", { delay: 50 });
  await page.waitForTimeout(500);

  await page.click("#checkTransfer");
  await page.click("#close");
  await page.waitForTimeout(2000);

  await page.click(`#productId-${id}`);

  await page.click("#nonBayerReceived");
  //add received
  await page.click("#addReceived");
  await page.type("#lotNumber", "testReceive", { delay: 50 });
  await page.type("#receivedQty", "9", { delay: 50 });
  await page.click("#checkSave");

  // add return

  await page.click("#addReturn");
  await page.click("#chooseLot");
  await page.click("#testLot");
  await page.type("#quantity", "10", { delay: 50 });

  await page.waitForTimeout(500);
  await page.click("#checkReturn");
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    location.reload(true);
  });
  await page.waitForTimeout(2000);

  await page.click("#nonBayerBtn");
  await page.waitForTimeout(1000);

  // const [fileChooser] = await Promise.all([
  //   page.waitForFileChooser(),
  //   await page.click("#importCsvRegularCom"),
  // ]);
  // await fileChooser.accept([
  //   `${homedir}/Downloads/Latest-Fertilizer-Chemical.csv`,
  // ]);
};

const dowanloadCsv = async (page) => {
  const ApiID = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json).apiSeedCompanies[0].id;
  });

  console.log(ApiID);
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: path.resolve(`${homedir}`),
  });

  if (ApiID) {
    for (let i = 0; i < 4; i++) {
      let cornType;
      if (i === 0) {
        cornType = "corn";
      } else if (i === 1) {
        cornType = "soybean";
      } else if (i === 2) {
        cornType = "alfalfa";
      } else if (i === 3) {
        cornType = "canola";
      } else if (i === 4) {
        cornType = "sorghum";
      }

      await page.goto(
        `${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${i}`,
        {
          waitUntil: ["domcontentloaded", "networkidle0"],
        }
      );
      await page.click(`#${cornType}`);
      await page.waitForTimeout(1000);
      await page.click("#dotBtns");

      await page.evaluate(() => {
        document.getElementById("downloadInventory").click();
      });
      await page.waitForTimeout(1500);
      await page.click("#downloadCsv");
      await page.goto(
        `${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${i}`,
        {
          waitUntil: ["domcontentloaded", "networkidle0"],
        }
      );
      await page.click(`#${cornType}`);
      await page.waitForTimeout(1000);
      await page.click("#dotBtns");
      await page.evaluate(() => {
        document.getElementById("downloadPO").click();
      });
      await page.waitForTimeout(1500);
      await page.click("#downloadCsv");

      // AllDealer report
      await page.goto(
        `${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${i}`,
        {
          waitUntil: ["domcontentloaded", "networkidle0"],
        }
      );
      await page.click(`#${cornType}`);
      await page.waitForTimeout(1000);
      await page.click("#dotBtns");
      await page.evaluate(() => {
        document.getElementById("downloadAllDealer").click();
      });
      await page.waitForTimeout(1500);
      await page.click("#downloadCsv");
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
    for (let i = 0; i < typeArray.length; i++) {
      if (seedId) {
        try {
          if (typeArray.length > 0) {
            //inventory report
            // await page.goto(
            //   `${URL}/app/seed_companies/${seedId}?selectedTab=${i}`,
            //   {
            //     waitUntil: ["domcontentloaded", "networkidle0"],
            //   }
            // );

            // await page.evaluate(() => {
            //   document.getElementById("nonBayerBtn").click();
            // });

            // await page.evaluate(() => {
            //   document.getElementById("nonBayerInventory").click();
            // });
            // await page.waitForTimeout(1500);
            // await page.click("#downloadCsv");

            //seedGrowerDetail report
            await page.goto(
              `${URL}/app/seed_companies/${seedId}?selectedTab=${i}`,
              {
                waitUntil: ["domcontentloaded", "networkidle0"],
              }
            );

            await page.evaluate(() => {
              document.getElementById("nonBayerBtn").click();
            });
            await page.evaluate(() => {
              document.getElementById("nonBayerGrowerDetail").click();
            });
            await page.waitForTimeout(1500);
            await page.click("#downloadCsv");
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
            await page.evaluate(() => {
              document.getElementById("nonBayerGrowerSummary").click();
            });
            await page.waitForTimeout(1500);
            await page.click("#downloadCsv");
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
        // //regularInventory report

        // await page.evaluate(() => {
        //   document.getElementById("nonBayerInventory").click();
        // });

        // await page.waitForTimeout(1500);
        // await page.click("#downloadCsv");
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
        await page.waitForTimeout(1500);
        await page.click("#downloadCsv");
        //regularGrowerSummary report
        await page.goto(`${URL}/app/companies/${Id}`, {
          waitUntil: ["domcontentloaded", "networkidle0"],
        });
        await page.evaluate(() => {
          document.getElementById("nonBayerBtn").click();
        });
        await page.evaluate(() => {
          document.getElementById("nonBayerGrowerSummary").click();
        });
        await page.waitForTimeout(1500);
        await page.click("#downloadCsv");
      } catch (error) {
        console.log("poID " + Id, error);
      }
    } else console.log("no regular Company found");
  }
  console.log("Done Normal company 👍 ");
};

const addDelivery = async (page) => {
  await page.evaluate(() => {
    document.getElementById("Grower Delivery").click();
  });
  await page.waitForTimeout(1000);

  await page.click("#addDeliveryReturn");
  await page.waitForTimeout(1000);
  await page.click("#selectAll");
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("accordion__heading-b").click();
  });
  await page.waitForTimeout(3000);

  await page.type("#fill-quantity-seed", "4.5", { delay: 50 });

  await page.type("#fill-quantity-bayer", "15", { delay: 50 });

  await page.type("#fill-quantity-regular", "5", { delay: 50 });

  await page.waitForTimeout(2000);

  await page.click("#submitDelivery");
  await page.waitForTimeout(1000);

  // await checkDeliveryValue(page);
  await page.waitForTimeout(4000);

  await page.evaluate(() => {
    location.reload(true);
  });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.getElementById("Return").click();
  });
  await page.waitForTimeout(1000);

  await page.click("#addDeliveryReturn");
  await page.waitForTimeout(1000);
  await page.click("#selectAll");

  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("accordion__heading-b").click();
  });
  await page.waitForTimeout(3000);
  await page.type("#fill-quantity-seed", "5", { delay: 50 });

  await page.type("#fill-quantity-bayer", "1", { delay: 50 });

  await page.type("#fill-quantity-regular", "4", { delay: 50 });
  await page.waitForTimeout(2000);

  await page.click("#submitDelivery");
  await page.waitForTimeout(5000);
  // await checkReturnProduct(page);
};

const checkDeliveryValue = async (page) => {
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    location.reload(true);
  });
  await page.waitForTimeout(2000);

  await page.click("#addDeliveryReturn");
  await page.waitForTimeout(1000);

  const itemQty = await page.evaluate(() => {
    const d =
      document.getElementById("#itemQty") &&
      document.getElementById("#itemQty").innerText;
    return d;
  });

  const remainQty = await page.evaluate(() => {
    const d =
      document.getElementById("remainQty") &&
      document.getElementById("remainQty").innerText;

    return d;
  });
  await page.waitForTimeout(500);

  const deliverdQty = await page.evaluate(() => {
    const d =
      document.getElementById("deliverdQty") &&
      document.getElementById("deliverdQty").innerText;

    return d;
  });
  await page.waitForTimeout(500);
  console.log(remainQty, "remainQty", deliverdQty, "deliverdQty", itemQty);

  if (remainQty === "5.50" && deliverdQty === "4.50") {
    console.log("Deliverd value are correect");
  } else {
    storeResponse.push({
      error: `Delivered value of product is not match with our calculation`,
    });
  }
  await page.waitForTimeout(2000);
};

const checkDiscountCalculation = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });

  await createSimpleOrder(
    page,
    "#createPO",
    "#addPo",
    "checkDiscountCalculation"
  );
  await createProduct(page, "$", "10");
  await page.waitForTimeout(2000);
  const dollerUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });
  console.log(dollerUnit, "dollerUnit2");
  if (dollerUnit == "$3,330.00") {
    console.log(
      "perBage $ Discount Total match with our calculation",
      dollerUnit
    );
  } else {
    storeResponse.push({
      error: `perBag $ Discount Total not match with our calculation--checkDiscountCalculation`,
    });
  }
  await page.waitForTimeout(2000);

  await createProduct(page, "%", "10");
  await page.waitForTimeout(1000);

  const percentageUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });
  console.log(percentageUnit, "percentageUnit2");
  if (percentageUnit == "$6,327.00") {
    console.log(
      "perBag % Discount Total match with our calculation",
      percentageUnit
    );
  } else {
    storeResponse.push({
      error: `perBag % Discount Total not match with our calculation--checkDiscountCalculation`,
    });
  }
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("addproductDots").click();
  });

  await page.waitForTimeout(4000);

  await page.click("#addWholeDiscount");
  await page.waitForTimeout(2000);
  await page.click("#wholeDiscount");
  await page.waitForTimeout(2000);
  await page.click("#discountChoose");
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.getElementById("discount$").click();
  });
  await page.waitForTimeout(1000);
  //wholeOrder doller discount
  const wholeDollerUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });
  console.log(wholeDollerUnit, "wholeDollerUnit2");
  if (wholeDollerUnit == "$6,317.00") {
    console.log(
      "WholeOrder $ Discount Total match with our calculation",
      wholeDollerUnit
    );
  } else {
    storeResponse.push({
      error: `WholeOrder $ Discount Total not match with our calculation--checkDiscountCalculation`,
    });
  }

  await page.waitForTimeout(2000);
  await page.click("#discountChoose");
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    document.getElementById("discount%").click();
  });
  await page.waitForTimeout(1000);

  //whole Order percentage discount
  const wholePercentageUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });
  console.log(wholePercentageUnit, "wholePercentageUnit2");

  if (wholePercentageUnit == "$5,694.30") {
    console.log(
      "WholeOrder % Discount Total match with our calculation",
      wholePercentageUnit
    );
  } else {
    storeResponse.push({
      error: `WholeOrder % Discount Total not match with our calculation--checkDiscountCalculation`,
    });
  }

  await page.click("#wholeComment");
  await page.type("#wholeComment", "WholeOrderCheck", { delay: 50 });
};
const createShareHolders = async (page, name, no) => {
  await page.waitForTimeout(1000);
  await page.click("#addShareHolders");
  await page.waitForTimeout(1000);
  await page.click("#shareholder-name");
  await page.waitForTimeout(1000);
  await page.type(`#react-select-${no}-input`, name, { delay: 50 });
  await page.waitForTimeout(1000);
  await page.click("#shareholder-name");
  await page.waitForTimeout(1000);
  await page.click("#createShareHolderbtn");
  await page.waitForTimeout(1000);
};
const checkComplexDiscount = async (page) => {
  try {
    await page.goto(`${URL}/app/customers`, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    await createSimpleOrder(
      page,
      "#createPO",
      "#addPo",
      "checkComplexDiscountCalculation"
    );
    await page.waitForTimeout(2000);

    await page.click("#addProduct");
    await page.waitForTimeout(2000);
    // create monsanto product
    await page.click("[data-test-id=companySelect]");
    await page.waitForTimeout(1000);
    await page.click("#apiSeed-Bayer");
    await page.waitForTimeout(2000);

    await page.click("#seedTypeSelect");
    await page.waitForTimeout(1000);

    await page.click("#corn");
    await page.waitForTimeout(1000);

    await page.click("#SS-RIB");
    await page.waitForTimeout(500);

    await page.click("#DKC64-34RIB");
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("500 + B300 + Nemastrike + EDC").click();
    });

    await page.waitForTimeout(500);
    await page.click("#AF");
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.getElementById("80M").click();
    });
    await page.waitForTimeout(500);
    await page.type("#quantity", "10", { delay: 50 });

    await page.waitForTimeout(2000);

    await page.click("#selectProduct");
    await page.waitForTimeout(1000);

    await page.click("#accordion__heading-b");
    await page.waitForTimeout(1000);
    // both doller unit
    await page.click("#perBag");
    await page.waitForTimeout(500);
    await page.click("#perBag2");
    await page.waitForTimeout(1000);

    const disTotalDoller = await page.evaluate(() => {
      const d = document.getElementById("disTotal").innerText;
      return d;
    });
    console.log(disTotalDoller, "disTotalDoller");
    if (disTotalDoller === "$3,500.00") {
      console.log(
        "Both PerBage discount with $ unit total is match with our calucaltion",
        disTotalDoller
      );
    } else {
      storeResponse.push({
        error: `Both PerBage discount with $ unit total is not match with our calucaltion-checkComplexDiscount`,
      });
    }
    //both percentage unit
    await page.click("#chooseUnit-perBag");
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("discount%").click();
    });
    await page.waitForTimeout(1000);

    await page.click("#chooseUnit-perBag2");
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("discount%").click();
    });
    const disTotalPer = await page.evaluate(() => {
      const d = document.getElementById("disTotal").innerText;
      return d;
    });
    console.log(disTotalPer, "disTotalPer");
    if (disTotalPer === "$2,997.60") {
      console.log(
        "Both PerBage discount with % unit total is match with our calucaltion",
        disTotalPer
      );
    } else {
      storeResponse.push({
        error: `Both PerBage discount with % unit total is not match with our calucaltion--checkComplexDiscount`,
      });
    }
    await page.waitForTimeout(1000);

    //first doller and second percentage
    await page.click("#chooseUnit-perBag");
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("discount$").click();
    });
    await page.waitForTimeout(1000);

    const disTotalDollerToPer = await page.evaluate(() => {
      const d = document.getElementById("disTotal").innerText;
      return d;
    });
    console.log(disTotalDollerToPer, "disTotalDollerToPer");
    if (disTotalDollerToPer === "$3,240.00") {
      console.log(
        "PerBage discount add first $ and second % unit total is match with our calucaltion",
        disTotalDollerToPer
      );
    } else {
      storeResponse.push({
        error: `PerBage discount add first $ and second % unit total is not match with our calucaltion--checkComplexDiscount`,
      });
    }
    await page.waitForTimeout(1000);

    //first percentage and second doller
    await page.click("#chooseUnit-perBag2");
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("discount$").click();
    });
    await page.waitForTimeout(1000);

    await page.click("#chooseUnit-perBag");
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      document.getElementById("discount%").click();
    });

    const disTotalPerToDoller = await page.evaluate(() => {
      const d = document.getElementById("disTotal").innerText;
      return d;
    });
    console.log(disTotalPerToDoller, "disTotalPerToDoller");
    if (disTotalPerToDoller === "$3,230.00") {
      console.log(
        "PerBage discount add first % and second $ unit total is match with our calucaltion",
        disTotalPerToDoller
      );
    } else {
      storeResponse.push({
        error: `PerBage discount add first % and second $ unit total is not  match with our calucaltion--checkComplexDiscount`,
      });
    }

    await page.waitForTimeout(1000);
    await page.click("#submitProduct");
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log(e);
  }
};
const checkDiscountCalculationEarlyPay = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });

  await createSimpleOrder(
    page,
    "#createPO",
    "#addPo",
    "checkDiscountEarlyPayCalculations"
  );
  await createProduct(page, "earlyPayInDollar", "10");
  await page.waitForTimeout(2000);
  const dollerUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });
  console.log(dollerUnit, "dollerUnit");
  if (dollerUnit == "$3,240.00") {
    console.log(
      "early pay $ Discount Total match with our calculation",
      dollerUnit
    );
  } else {
    storeResponse.push({
      error: `early pay $ Discount Total not match with our calculation-checkDiscountCalculationEarlyPay`,
    });
  }
  await page.waitForTimeout(2000);

  await createProduct(page, "earlyPayInPercentage", "10");
  await page.waitForTimeout(1000);

  const percentageUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });
  console.log(percentageUnit, "percentageUnit");
  if (percentageUnit == "$6,237.00") {
    console.log(
      "early pay % Discount Total match with our calculation",
      percentageUnit
    );
  } else {
    storeResponse.push({
      error: `early pay % Discount Total not match with our calculation-checkDiscountCalculationEarlyPay`,
    });
  }
  await page.waitForTimeout(4000);
  await createProduct(page, "earlyPayBothCase1", "10");
  await page.waitForTimeout(1000);

  const bothUnitCase1 = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });
  console.log(bothUnitCase1, "bothUnitCase1");
  if (bothUnitCase1 == "$9,153.00") {
    console.log(
      "early pay bothUnitCase1 Discount Total match with our calculation",
      bothUnitCase1
    );
  } else {
    storeResponse.push({
      error: `early pay bothUnitCase1 Discount Total not match with our calculation--checkDiscountCalculationEarlyPay`,
    });
  }
  await page.waitForTimeout(4000);
  await createProduct(page, "earlyPayBothCase2", "10");
  await page.waitForTimeout(1000);

  const bothUnitCase2 = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });
  console.log(bothUnitCase2, "bothUnitCase2");
  if (bothUnitCase2 == "$12,060.00") {
    console.log(
      "early pay bothUnitCase2 Discount Total match with our calculation",
      bothUnitCase2
    );
  } else {
    storeResponse.push({
      error: `early pay bothUnitCase2 Discount Total not match with our calculation--checkDiscountCalculationEarlyPay`,
    });
  }
  await page.waitForTimeout(1000);
};
const signUpUser = async (req, res) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });

  await page.goto(`${URL}/sign_up`);
  await page.waitForTimeout(1000);
  try {
    await page.type("#organization-name", "testOrg", { delay: 50 });
    await page.type("#address", "addressTest", { delay: 50 });
    await page.type("#businessStreet", "businessStreetTest", { delay: 50 });

    await page.type("#businessCity", "businessCityTest", { delay: 50 });

    await page.type("#businessState", "businessStateTest", { delay: 50 });

    await page.type("#businessZip", "businessZipTest", { delay: 50 });

    await page.click('[type="button"]');
    await page.waitForTimeout(2000);

    await page.type("#user-firstName", "TestfirstName", { delay: 50 });
    await page.type("#user-lastName", "TestlastName", { delay: 50 });
    await page.type("#phoneNumber", "741258963", { delay: 50 });
    await page.type("#user-email", USERNAME, {
      delay: 50,
    });
    await page.type("#user-password", "1234", { delay: 50 });
    await page.type("#user-passwordConfirmation", "1234", { delay: 50 });
    await page.waitForTimeout(1000);

    await page.click("#createUser");

    await page.on("response", async (response) => {
      if (response.url() == `${APIURL}/api/auth/sign_up`) {
        console.log("XHR response received");
        const data = await response.json();
        data.errors &&
          storeResponse.push({
            error: data.errors,
          });
      }
    });
    await page.waitForTimeout(2000);
    browser.close();
  } catch (e) {
    console.log("error while hardcode Test", e);
    storeResponse.push({
      error: "Sign up a user failed",
    });
  }
  fs.writeFileSync(
    path.join(__dirname, "../crashedReport/hardCodeTestError.json"),
    JSON.stringify(storeResponse)
  );
  const error1 = fs.readFileSync(
    path.join(__dirname, "../crashedReport/hardCodeTestError.json"),
    { encoding: "utf8" }
  );

  res.render("getError", {
    data: JSON.parse(error1),
  });
};

const addPayment = async (page, type) => {
  const ApiID = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json).apiSeedCompanies[0].id;
  });
  await page.waitForTimeout(3000);

  await page.click("#Payments");
  await page.waitForTimeout(3000);
  await page.click("#addPayment2");
  await page.waitForTimeout(3000);
  await page.click("#addPaymentRow");
  await page.waitForTimeout(1000);

  await page.click(`#isDisable-1-${ApiID}-Bayer`);
  await page.waitForTimeout(1000);

  await page.type("#amount", "10", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#checkTransfer");
  await page.waitForTimeout(1000);

  await page.click("#closePayment");
  await page.waitForTimeout(1000);
  await page.click("#pdfClick");
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    location.reload(true);
  });
  await page.waitForTimeout(2000);
};

const customerSeedWarehouseReport = async (page) => {
  await page.waitForTimeout(1000);
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(1000);
  await page.click("#customerDot");
  await page.waitForTimeout(3000);
  await page.click("#seedWareHouseReport");

  await page.waitForTimeout(3000);
};

const detailSeedWarehouseReport = async (page) => {
  const ApiID = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json).apiSeedCompanies[0].id;
  });
  await page.goto(`${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${0}`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(3000);
  await page.click("#dotBtns");
  await page.waitForTimeout(3000);
  await page.click("#seedWareHouseReport");
  await page.waitForTimeout(3000);
  await page.click("#downloadCsv");
};

const deleteProduct = async (page) => {
  await page.waitForTimeout(2000);
  await page.click("#productActions");
  await page.waitForTimeout(1000);

  await page.click("#deleteProduct");
  await page.waitForTimeout(1000);

  await page.click("#productOk");
};

const deletePOAndProduct = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await createSimpleOrder(page, "#createPO", "#addPo", "deletePO");
  await page.waitForTimeout(2000);

  await createProduct(page);
  await page.waitForTimeout(3000);

  await deleteProduct(page);
  await page.waitForTimeout(3000);
  await page.click("#addproductDots");
  await page.click("#addproductDots");

  await page.waitForTimeout(2000);
  await page.click("#markAsReplant");
  await page.waitForTimeout(1000);

  await page.click("#changePoName");
  await page.waitForTimeout(1000);

  await page.type("#changeName", "changePOName", { delay: 50 });
  await page.click("#SubmitName");
  await page.waitForTimeout(1000);

  await page.click("#addproductDots");
  await page.waitForTimeout(1000);

  await page.click("#editAllProduct");
  await page.waitForTimeout(2000);

  await page.click("#goBackToProduct");
  await page.waitForTimeout(3000);

  await page.click("#addproductDots");
  await page.waitForTimeout(1000);

  await page.click("#deletePO");
  await page.waitForTimeout(1000);
  await page.click("#ok");
};
async function importCustomer(page) {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  try {
    await page.click("#customerDot");

    await page.waitForTimeout(1000);
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      await page.click("#importCustCsv"),
    ]);
    await fileChooser.accept([`${homedir}/Downloads/customers-data.csv`]);
  } catch (error) {
    storeResponse.push({
      error: error.toString(),
    });
  }
}

const checkimportdealerTransfer = async (page) => {
  const ApiID = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json).apiSeedCompanies[0].id;
  });

  await page.goto(`${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${0}`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });

  if (ApiID) {
    page.click("#dotBtns");
    await page.waitForTimeout(1000);
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      await page.click("#importDealerTransfer"),
    ]);
    await fileChooser.accept([
      `${homedir}/Downloads/Stock-Transfer-Detailed-Report_20220622 (2).csv`,
    ]);
  } else {
    await checkimportdealerTransfer(page);
  }
};

const checkBalanceDueModel = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(3000);
  const balance = await page.evaluate(() => {
    const d = document.getElementById("balanceDue").innerText;
    return d;
  });

  if (balance === "$18,837.38") {
    console.log("balance calculation is coreect");
  } else {
    storeResponse.push({
      error: `Balance Due of Customer is not match with our calculation`,
    });
  }

  await page.click("#balanceDue");
  const balancePayment = await page.evaluate(() => {
    const d = document.getElementById("totalPayment").innerText;
    return d;
  });
  if (balancePayment === "$18,837.38") {
    console.log("balance nmodel is coreect");
  } else {
    storeResponse.push({
      error: `Balance model with payment of Customer is not match with our calculation`,
    });
  }
};

const checkSearchbar = async (page) => {
  await page.type("#searchBar", "ss", { delay: 50 });
  await page.waitForTimeout(1500);
};

const checkSort = async (page) => {
  await page.waitForTimeout(500);

  await page.click("#Products");
  await page.waitForTimeout(500);
  await page.click("#Products");

  await page.waitForTimeout(1000);
  await page.click("#Variety");
  await page.waitForTimeout(500);
  await page.click("#Variety");

  await page.waitForTimeout(1000);
  await page.click("#RM");
  await page.waitForTimeout(500);
  await page.click("#RM");

  await page.waitForTimeout(1000);
  await page.click("#Treatment");
  await page.waitForTimeout(500);
  await page.click("#Treatment");

  await page.waitForTimeout(1000);
  await page.click("#Packaging");
  await page.waitForTimeout(500);
  await page.click("#Packaging");

  await page.waitForTimeout(1000);
  await page.click("#Seedsize");
  await page.waitForTimeout(500);
  await page.click("#Seedsize");

  // await page.waitForTimeout(1000);
  // await page.click("#MSRP");
  // await page.waitForTimeout(500);
  // await page.click("#MSRP");

  // await page.waitForTimeout(1000);
  // await page.click("#Warehouse");
  // await page.waitForTimeout(500);
  // await page.click("#Warehouse");

  // await page.waitForTimeout(1000);
  // await page.click("#MyDealerBucket");
  // await page.waitForTimeout(500);
  // await page.click("#MyDealerBucket");

  // await page.waitForTimeout(1000);
  // await page.click("#ReceivedByDealer");
  // await page.waitForTimeout(500);
  // await page.click("#ReceivedByDealer");

  // await page.waitForTimeout(1000);
  // await page.click("#DeliveredToGrower");
  // await page.waitForTimeout(500);
  // await page.click("#DeliveredToGrower");

  // await page.waitForTimeout(1000);
  // await page.click("#DemandAllGrowers");
  // await page.waitForTimeout(500);
  // await page.click("#DemandAllGrowers");

  // await page.waitForTimeout(1000);
  // await page.click("#Demand");
  // await page.waitForTimeout(500);
  // await page.click("#Demand");

  await page.waitForTimeout(1000);
};

const checkReplantFeatures = async (page) => {
  await page.waitForTimeout(1000);
  await page.click("#addproductDots");
  await page.waitForTimeout(2000);

  const isOption = await page.evaluate(() => {
    const d = document.getElementById("markAsReplant");
    return d;
  });

  if (isOption != null) {
    await page.waitForTimeout(2000);
    await page.click("#markAsReplant");
    await page.waitForTimeout(1000);
    await page.click("#productActions");
    await page.waitForTimeout(1000);
    await page.click("#productReplant");
    await page.waitForTimeout(2000);
    await checkEditMsrp(page);
  }
};

const checkEditMsrp = async (page) => {
  await page.click("#addproductDots");
  await page.waitForTimeout(2000);
  await page.click("#editMsrp");
  await page.waitForTimeout(1000);
  await page.type("#editMSRP", "100", { delay: 50 });
  await page.waitForTimeout(1000);
  await page.click("#saveMSRP");
  await page.waitForTimeout(1000);
};

const checkDeliveries = async (page) => {
  await page.waitForTimeout(1000);
  await page.click("#showDeliveries");
  await page.waitForTimeout(1000);

  const d = await page.evaluate(() => {
    const d = document.getElementById("qtyDelivered");
    return d;
  });
  await page.waitForTimeout(500);

  if (d === null) {
    storeResponse.push({
      error: "In product tab Showdeliveies option not work",
    });
  }
};

const checkCustomerReport = async (page) => {
  await page.waitForTimeout(2000);
  await page.goto(`${URL}/app/reports/customer_report`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(3000);

  await page.click("#downloadCsv");
};

const checkgrowerOrderReport = async (page) => {
  await page.waitForTimeout(2000);
  await page.goto(`${URL}/app/reports/growerOrder_report`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(2000);

  await page.click("#filterByGrower");
  await page.waitForTimeout(1000);

  await page.click("#All");
  await page.click("#All");
  await page.waitForTimeout(2000);

  await page.click("#customerDot");
  await page.waitForTimeout(1000);

  await page.click("#customerDot");

  await page.waitForTimeout(1000);
  await page.click("#downloadCsv");
  await page.waitForTimeout(3000);

  await page.click("#dataPDF");
};
const checkInventoryReport = async (page) => {
  await page.waitForTimeout(2000);
  await page.goto(`${URL}/app/reports/inventory_report`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });

  await page.click("#selectCompaines");
  await page.waitForTimeout(1000);
  await page.click("#bayer");
  await page.waitForTimeout(1000);

  await page.click("#cropType");

  await page.waitForTimeout(1000);

  await page.click("#corn");

  await page.waitForTimeout(1000);
  await page.click("#generateReport");
  await page.waitForTimeout(5000);

  const d = await page.evaluate(() => {
    const d = document.getElementById("generateTable");
    return d;
  });

  if (d === null) {
    storeResponse.push({
      error: "Inventory Report is not generate",
    });
  } else {
    await page.click("#customerDot");
    await page.waitForTimeout(1000);

    await page.click("#downloadCsv");
    await page.waitForTimeout(3000);

    await page.click("#dataPDF");
  }
};

const checkProfitReport = async (page) => {
  await page.waitForTimeout(2000);
  await page.goto(`${URL}/app/reports/profit_report`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });

  await page.click("#selectCompaines");
  await page.waitForTimeout(1000);
  await page.click("#bayer");
  await page.waitForTimeout(1000);

  await page.click("#cropType");

  await page.waitForTimeout(1000);

  await page.click("#corn");

  await page.waitForTimeout(1000);
  await page.click("#generateReport");
  await page.waitForTimeout(5000);

  const isProfitTable = await page.evaluate(() => {
    const d = document.getElementById("generateTable");
    return d;
  });

  if (isProfitTable === null) {
    storeResponse.push({
      error: "Profit Report is not generate",
    });
  } else {
    await page.click("#customerDot");
    await page.waitForTimeout(1000);

    await page.click("#downloadCsv");
    await page.waitForTimeout(3000);

    await page.click("#dataPDF");
  }
};

const checkInventoryPurchaseOrder = async (page) => {
  const ApiData = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json);
  });
  await page.waitForTimeout(1000);
  const ApiID =
    (ApiData.apiSeedCompanies[0] && ApiData.apiSeedCompanies[0].id) || 20;

  //synce dealer deatiled page
  await page.goto(`${URL}/app/d_api_seed_companies/${ApiID}?selectedTab=${0}`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(1000);
  await page.click("#dotBtns");
  await page.evaluate(() => {
    document.getElementById("downloadPO").click();
  });
  await page.waitForTimeout(2500);
  await page.click("#downloadCsv");

  const path = `${homedir}/Downloads/cornPurchaseOrderReports.csv`;

  await fs
    .createReadStream(path)
    .on("error", (err) => {
      console.log(err);
      // handle error
    })

    .pipe(csvParser())
    .on("data", async (row) => {
      if (row["Purchase Order Name."] === "testSimpleQuote") {
        storeResponse.push({
          error: `In Inventory PurchaseOrder Report still contain quote data`,
        });
      } else {
        console.log("InventoryPurchaseOrderReport work perfectlly");
      }

      // use row data
    });
};

const checkCustomerDeliveriesField = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(1000);

  await page.click("#showDeliveries");
  await page.waitForTimeout(1000);

  const d = await page.evaluate(() => {
    const d = document.getElementById("BayerDeliveryStatus");
    return d;
  });

  const s = await page.evaluate(() => {
    const s = document.getElementById("NonBayerDeliveryStatus");
    return s;
  });
  const syncRadio = await page.evaluate(() => {
    const s = document.getElementById("notSyncedBayerDeliveryReceipt");
    return s;
  });
  await page.waitForTimeout(500);

  if (d === null && s === null && syncRadio === null) {
    storeResponse.push({
      error: "In customer page Showdeliveies option not work",
    });
  }

  await page.click("#notSyncedBayerDeliveryReceipt");
  await page.waitForTimeout(1000);
  await page.click("#unDeliveredBayerProducts");
  await page.waitForTimeout(1000);

  await page.click("#notSyncProduct");
  await page.waitForTimeout(1000);
};

const growerTransferWithChangeProduct = async (page) => {
  await createCustomer(page, "growerTransferWithChangeProduct");
  await createSimpleOrder(
    page,
    "#createPO",
    "#addPo",
    "transferTestPOWithChangeProduct",
    "growerTransferWithChangeProduct"
  );

  await createProduct(page);
  await page.waitForTimeout(2000);

  await page.click("#selectPOforsync");
  await page.waitForTimeout(1000);

  await page.click("#syncwithbayer");
  await page.waitForTimeout(20000);

  await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });
  await page.waitForTimeout(1000);

  await page.click("#productActions");
  await page.waitForTimeout(1000);

  await page.click("#editQuantity");

  let searchInput = await page.$("#quantity");
  await page.waitForTimeout(2000);
  await searchInput.click({ clickCount: 3 });
  await searchInput.press("Backspace");
  await page.type("#quantity", "5", { delay: 50 });

  await page.evaluate(() => {
    document.getElementById("VT2P/BR2").click();
  });

  await page.waitForTimeout(500);

  await page.click("#RT6203SHORT");
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.getElementById("Acceleron500+B300+Enhanced Dis").click();
  });

  await page.waitForTimeout(500);
  await page.click("#AR2");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document.getElementById("SP45").click();
  });
  await page.waitForTimeout(500);

  await page.click("#transferWay");
  await page.waitForTimeout(1000);

  await page.click("#toGrower");
  await page.waitForTimeout(2000);

  await page.click("#customerSelect");
  await page.waitForTimeout(1000);

  await page.click("#customer-0");
  await page.waitForTimeout(1000);
  await page.click("#poSelect");
  await page.click("#po-0");
  await page.waitForTimeout(1000);

  await page.click("#farmname");
  await page.click("#farm-0");
  await page.waitForTimeout(1000);

  await page.click("#selectLine");
  await page.click("#newline");
  await page.waitForTimeout(1000);

  await page.click("#submitProduct");
  await page.click("#trasfer_ok");
  await page.waitForTimeout(3000);
};

const checkSwitchFarm = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");
  await page.waitForTimeout(1000);

  await page.waitForTimeout(1000);
  await page.click("#createPO");

  await page.click("#addPo");

  await page.waitForTimeout(500);

  await page.type("#POname", `switchFarmTest`, { delay: 90 });
  await page.click("#advancePO");

  await page.waitForTimeout(2000);
  await page.click("#ProceedBtn");

  await page.waitForTimeout(4000);
  await page.click("#addFarm");
  await page.waitForTimeout(500);

  await page.click("#addFarm");

  await page.type("#farm-name", "switchFarm", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#createFarm");
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    location.reload(true);
  });
  await page.waitForTimeout(4000);

  await page.click("#addFarm");
  await page.waitForTimeout(1000);

  await page.type("#farm-name", "testFarm", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#createFarm");
  await page.waitForTimeout(1000);
  await page.click("#farmExpand");
  await page.waitForTimeout(1000);
  await page.click("#openMenuItem");
  await page.waitForTimeout(1000);

  await createSeedroduct(page);
  await page.waitForTimeout(1000);

  await page.waitForTimeout(2000);
  await page.click("#productActions");
  await page.waitForTimeout(500);

  await page.click("#switchFarms");
  await page.waitForTimeout(1000);

  await page.click("#SelectFarmForSwitch");
  await page.waitForTimeout(1000);

  await page.click("#switchFarm");
  await page.waitForTimeout(1500);

  await page.click("#saveSwitchFarm");
};

const unarchivedCustomer = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");
  await page.waitForTimeout(1000);

  await page.click("#createCustomer");

  await page.waitForTimeout(500);

  await page.type("#name", "archivedCustTest", { delay: 90 });
  await page.waitForTimeout(1000);

  await page.click("#isArchive");
  await page.waitForTimeout(5000);

  await page.click("#viewCustomer");
  await page.waitForTimeout(2000);

  await page.click("#customerDot");
  await page.waitForTimeout(1000);
  await page.click("#showArchivedCustomer");
  await page.waitForTimeout(1000);
  await page.click("#ArchivedCust");
  await page.waitForTimeout(500);
  await page.click("#unArchived");
  await page.waitForTimeout(1000);
  await page.click("#close");
};
const checkGropedDetailPage = async (page) => {
  const ApiID = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json).apiSeedCompanies[0].id;
  });
  await page.waitForTimeout(2000);
  await page.goto(`${URL}/app/g_api_seed_companies/${ApiID}`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(2000);

  await page.click("#fillAllShort");
  await page.waitForTimeout(2000);
  await page.type("#dealerInputQty", "85", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#syncBayer");
  await page.waitForTimeout(4000);
};

const checkTempletList = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.waitForTimeout(2000);
  await page.click("#customerDot");
  await page.waitForTimeout(1000);

  await page.click("#templateList");
};

module.exports = { HardCodeTest, signUpUser };
