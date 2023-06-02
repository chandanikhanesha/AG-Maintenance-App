const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const USERNAME = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const BAYER_USERNAME = process.env.BAYER_USERNAME;
const BAYER_PASSWORD = process.env.BAYER_PASSWORD;
const BAYER_GLN_ID = process.env.BAYER_GLN_ID;
const URL = process.env.URL;
const os = require("os");
const APIURL = process.env.APIURL;

const homedir = os.homedir();
let storeResponse = [];
const checkFailTest = async (req, res) => {
  console.log("started");
  // req.body.orgName = "BAR DOUBLE DIAMOND SEED";
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });

  try {
    await page.goto(`${URL}/log_in`);
    await page.waitForTimeout(1000);

    await page.type("#email", USERNAME, { delay: 50 });
    await page.type("#password", PASSWORD, { delay: 50 });

    await page.click('[type="submit"]');
    await page.waitForTimeout(2000);

    await page.goto(`${URL}/app/customers`, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });
    await checkDiscountCalculationEarlyPay(page);
    await checkDiscountCalculation(page);
    await page.waitForTimeout(2000);
    await checkComplexDiscount(page);
    await page.waitForTimeout(3000);

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

    return res.status(200).json({ message: "Test successfully" });
  } catch (error) {
    console.log("error while hardcode Test", error);
    storeResponse.push({
      error: error.toString(),
    });
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
  }

  await browser.close();
};

const wrongLogInTest = async (req, res) => {
  console.log("started");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });

  await page.goto(`${URL}/log_in`);
  await page.waitForTimeout(1000);

  await page.type("#email", "fakeEmail@gmail.com", { delay: 50 });
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

const wrongBayerConnectivity = async (req, res) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setViewport({ width: 1366, height: 768 });

  await page.goto(`${URL}/log_in`);
  await page.waitForTimeout(1000);

  await page.type("#email", USERNAME, { delay: 50 });
  await page.type("#password", PASSWORD, { delay: 50 });

  await page.click('[type="submit"]');
  await page.waitForTimeout(2000);
  try {
    await page.goto(`${URL}/app/companies/create`, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    await page.evaluate(() => {
      document.getElementById("bayerConnectivityBtn").click();
    });

    await page.waitForTimeout(500);

    await page.type("#bayerUserName", "58965ww8", { delay: 50 });
    await page.type("#bayerPassword", BAYER_PASSWORD, { delay: 50 });
    await page.type("#bayerGlnID", BAYER_GLN_ID, { delay: 50 });
    await page.evaluate(() => {
      document.getElementById("connectWithBayer").click();
    });
    await page.on("response", async (response) => {
      if (response.url() == `${APIURL}/api/monsanto/grower_licence/check`) {
        console.log("XHR response received");
        const data = await response.json();
        data.error &&
          storeResponse.push({
            error: data.error["con:reason"][0],
          });
      }
    });
    await page.waitForTimeout(6000);
  } catch (e) {
    storeResponse.push({
      error: "Bayer Company alredy exits",
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

const createCustomer = async (page) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");
  await page.waitForTimeout(1000);

  await page.click("#createCustomer");

  await page.waitForTimeout(500);

  await page.type("#name", "test", { delay: 90 });

  await page.click("#viewCustomer");
  await page.waitForTimeout(2000);

  await page.click("#test");
  await page.click("#Licence");

  await page.type("#monsantoTechnologyId", BAYER_TECHID, { delay: 50 });

  await page.waitForTimeout(2000);

  await page.click("#connectwithbayer");
  await page.waitForTimeout(5000);

  await page.click("#viewCustomer");
  await page.waitForTimeout(2000);
};

const createSimpleOrder = async (page, createType, orderType, name) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");

  await page.waitForTimeout(1000);
  await page.click(createType);

  await page.click(orderType);

  await page.waitForTimeout(500);

  await page.type("#POname", `${name}`, { delay: 90 });
  await page.click("#simplePo");

  await page.waitForTimeout(2000);
  await page.click("#ProceedBtn");

  await page.waitForTimeout(1000);
};

const createProduct = async (page, value) => {
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
    await page.click("#perBag");
    if (value === "%") {
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
  await createProduct(page);
  await page.waitForTimeout(2000);
  const dollerUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });

  if (dollerUnit == "$3,60.00") {
    console.log(
      "perBage $ Discount Total match with our calculation",
      dollerUnit
    );
  } else {
    storeResponse.push({
      error: `perBag $ Discount Total not match with our calculation`,
    });
  }
  await page.waitForTimeout(2000);

  await createProduct(page, "%");
  await page.waitForTimeout(1000);

  const percentageUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });

  if (percentageUnit == "$7,04.00") {
    console.log(
      "perBag % Discount Total match with our calculation",
      percentageUnit
    );
  } else {
    storeResponse.push({
      error: `perBag % Discount Total not match with our calculation`,
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
  await page.waitForTimeout(1000);

  //wholeOrder doller discount
  const wholeDollerUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });

  if (wholeDollerUnit == "$7,04.00") {
    console.log(
      "WholeOrder $ Discount Total match with our calculation",
      wholeDollerUnit
    );
  } else {
    storeResponse.push({
      error: `WholeOrder $ Discount Total not match with our calculation`,
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

  if (wholePercentageUnit == "$6,39.60") {
    console.log(
      "WholeOrder % Discount Total match with our calculation",
      wholePercentageUnit
    );
  } else {
    storeResponse.push({
      error: `WholeOrder % Discount Total not match with our calculation`,
    });
  }
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

    if (disTotalDoller === "$3,560.00") {
      console.log(
        "Both PerBage discount with $ unit total is match with our calucaltion",
        disTotalDoller
      );
    } else {
      await page.evaluate(() => {
        storeResponse.push({
          error: `Both PerBage discount with $ unit total is not match with our calucaltion`,
        });
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

    if (disTotalPer === "$3,04.60") {
      console.log(
        "Both PerBage discount with % unit total is match with our calucaltion",
        disTotalPer
      );
    } else {
      storeResponse.push({
        error: `Both PerBage discount with % unit total is not match with our calucaltion`,
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

    if (disTotalDollerToPer === "$3,29.00") {
      console.log(
        "PerBage discount add first $ and second % unit total is match with our calucaltion",
        disTotalDollerToPer
      );
    } else {
      storeResponse.push({
        error: `PerBage discount add first $ and second % unit total is not match with our calucaltion`,
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

    if (disTotalPerToDoller === "$3,28.00") {
      console.log(
        "PerBage discount add first % and second $ unit total is match with our calucaltion",
        disTotalPerToDoller
      );
    } else {
      storeResponse.push({
        error: `PerBage discount add first % and second $ unit total is not  match with our calucaltion`,
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
  await createCustomer(page);
  await createSimpleOrder(
    page,
    "#createPO",
    "#addPo",
    "checkDiscountEarlyPayCalculations"
  );
  await createProduct(page, "earlyPayInDollar");
  await page.waitForTimeout(2000);
  const dollerUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });

  if (dollerUnit == "$3,66.00") {
    console.log(
      "early pay $ Discount Total match with our calculation",
      dollerUnit
    );
  } else {
    storeResponse.push({
      error: `early pay $ Discount Total not match with our calculation`,
    });
  }
  await page.waitForTimeout(2000);

  await createProduct(page, "earlyPayInPercentage");
  await page.waitForTimeout(1000);

  const percentageUnit = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });

  if (percentageUnit == "$7,04.00") {
    console.log(
      "early pay % Discount Total match with our calculation",
      percentageUnit
    );
  } else {
    storeResponse.push({
      error: `early pay % Discount Total not match with our calculation`,
    });
  }
  await page.waitForTimeout(4000);
  await createProduct(page, "earlyPayBothCase1");
  await page.waitForTimeout(1000);

  const bothUnitCase1 = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });

  if (bothUnitCase1 == "$10,33.00") {
    console.log(
      "early pay bothUnitCase1 Discount Total match with our calculation",
      bothUnitCase1
    );
  } else {
    storeResponse.push({
      error: `early pay bothUnitCase1 Discount Total not match with our calculation`,
    });
  }
  await page.waitForTimeout(4000);
  await createProduct(page, "earlyPayBothCase2");
  await page.waitForTimeout(1000);

  const bothUnitCase2 = await page.evaluate(() => {
    const d = document.querySelector("[data-test-id=gradTotal]")
      ? document.querySelector("[data-test-id=gradTotal]").textContent
      : 0;
    return d;
  });

  if (bothUnitCase2 == "$13,62.00") {
    console.log(
      "early pay bothUnitCase2 Discount Total match with our calculation",
      bothUnitCase2
    );
  } else {
    storeResponse.push({
      error: `early pay bothUnitCase2 Discount Total not match with our calculation`,
    });
  }
  await page.waitForTimeout(1000);
};

module.exports = { checkFailTest, wrongLogInTest, wrongBayerConnectivity };
