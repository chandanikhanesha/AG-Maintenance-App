const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const USERNAME = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const BAYER_USERNAME = process.env.BAYER_USERNAME;
const BAYER_PASSWORD = process.env.BAYER_PASSWORD;
const BAYER_GLN_ID = process.env.BAYER_GLN_ID;

const BAYER_TECHID = process.env.BAYER_TECHID;
const APIURL = process.env.APIURL;
const { sendEmail } = require("../sendEmail");
const pathToAttachment = `${__dirname}/../crashedReport/crashed.json`;
const attachment = fs.readFileSync(pathToAttachment).toString("base64");
const URL = process.env.URL;

let storeResponse = [];
const csvParser = require("csv-parser");

const checkPaymentCalculation = async (req, res) => {
  await fs.writeFileSync(
    path.join(__dirname, "../crashedReport/hardCodeTestError.json"),
    JSON.stringify([])
  );
  // req.body.orgName = "Midwest Ag Products";
  console.log("started");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  page.setViewport({ width: 1706, height: 908 });
  const URL = process.env.URL;

  // const pendingXHR = new PendingXHR(page);

  try {
    await page.goto(`${URL}/log_in`);
    await page.waitForTimeout(1000);

    await page.type("#email", USERNAME, { delay: 50 });
    await page.type("#password", PASSWORD, { delay: 50 });

    await page.click('[type="submit"]');
    await page.waitForTimeout(5000);

    await createCustomer(page);
    await page.waitForTimeout(2000);

    await createAdvanceOrder(page, "#createPO", "#addPo", "AdvancetestPO");
    await page.waitForTimeout(2000);

    await addPayment(page);
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
  } catch (error) {
    console.log("error", error);
  }
};

module.exports = { checkPaymentCalculation };
const createCustomer = async (page, name) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");
  await page.waitForTimeout(1000);

  await page.click("#createCustomer");

  await page.waitForTimeout(500);

  await page.type("#name", "ATestCase2", { delay: 90 });
  await page.waitForTimeout(1000);

  await page.click("#viewCustomer");
  await page.waitForTimeout(2000);

  await page.click(name ? `#${name}` : "#ATestCase2");
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

const createAdvanceOrder = async (page, createType, orderType, name) => {
  await page.goto(`${URL}/app/customers`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.click("#addNewCustomer");
  await page.waitForTimeout(1000);

  await page.waitForTimeout(1000);
  await page.click(createType);
  await page.waitForTimeout(1000);

  await page.click("#ATestCase2-radio");
  await page.waitForTimeout(1000);

  await page.click(orderType);

  await page.waitForTimeout(500);

  await page.type("#POname", `${name}`, { delay: 90 });
  await page.click("#advancePO");

  await page.waitForTimeout(2000);
  await page.click("#ProceedBtn");

  await page.waitForTimeout(3000);
  await page.click("#addFarm");
  await page.waitForTimeout(3000);

  await page.type("#farm-name", "testFarm", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#createFarm");
  await page.waitForTimeout(1000);
  await page.click("#farmExpand");
  await page.waitForTimeout(1000);
  await page.click("#openMenuItem");
  await page.waitForTimeout(1000);

  await createProduct(page);
  await page.waitForTimeout(1000);
  await page.click("#openMenuItem");
  await page.waitForTimeout(1000);

  await createSeedroduct(page);

  await page.click("#openMenuItem");
  await createShareHolders(page, "add1ShareHolder", 2);
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
  await page.type("#quantity", "23", { delay: 50 });

  await page.waitForTimeout(2000);

  await page.click("#selectProduct");
  await page.waitForTimeout(1000);
  await page.click("#accordion__heading-b");
  await page.waitForTimeout(1000);

  await page.click("#earlyPayInDollar");
  await page.waitForTimeout(500);

  await page.click("#perBag");
  await page.waitForTimeout(1000);
  await page.click("#submitProduct");
  await page.waitForTimeout(1000);
};
const addPayment = async (page, type) => {
  const ApiID = await page.evaluate(() => {
    const json = localStorage.getItem("reduxPersist:apiSeedCompanyReducer");
    return JSON.parse(json).apiSeedCompanies[0].id;
  });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    return document.getElementById("Payments").click();
  });

  await page.waitForTimeout(3000);
  await page.click("#addPayment2");
  await page.waitForTimeout(3000);

  await page.click(`#isDisable-1-${ApiID}-Bayer`);
  await page.waitForTimeout(1000);

  await page.type("#Bayer-amount", "23", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#checkTransfer");
  await page.waitForTimeout(1000);

  await page.click("#closePayment");
  await page.waitForTimeout(1000);
  await page.waitForTimeout(3000);
  const invoiceData = await page.evaluate(() => {
    let data = [];
    let elements = document.getElementsByClassName("invoiceAmount");
    for (var element of elements)
      data.push(parseFloat(element.innerHTML.split("$")[1].replace(",", "")));
    return data;
  });
  console.log(invoiceData, "invoiceData");
  await page.waitForTimeout(3000);
  const balanceData = await page.evaluate(() => {
    let data = [];
    let elements = document.getElementsByClassName("balanceAmount");
    for (var element of elements)
      data.push(parseFloat(element.innerHTML.split("$")[1].replace(",", "")));
    return data;
  });
  console.log(balanceData, "balanceData");

  const paymentData = await page.evaluate(() => {
    let data = [];
    let elements = document.getElementsByClassName("paymentAmount");
    for (var element of elements)
      data.push(parseFloat(element.innerHTML.split("$")[1].replace(",", "")));
    return data;
  });

  console.log(paymentData, "paymentData");
  const path1 = path.join(__dirname, "../paymentCalculation.csv");

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

      data.map(async (element, i) => {
        setTimeout(async () => {
          //InvoiceAmount calculation
          if (invoiceData.includes(parseFloat(element.invoiceAmount))) {
            console.log(
              `InvoiceAmount ${element.invoiceAmount} is match for ${element.date}`
            );
          } else {
            storeResponse.push({
              error: `InvoiceAmount of ${element.invoiceAmount} with paymentDate ${element.date} is not match with sheet`,
            });
          }
          //BalanceAmount calculation
          if (balanceData.includes(parseFloat(element.balanceDue))) {
            console.log(
              `balanceAmount ${element.balanceDue} is match for ${element.date}`
            );
          } else {
            storeResponse.push({
              error: `BalanceAmount of ${element.invoiceAmount} with paymentDate ${element.date} is not match with sheet`,
            });
          }
          //paymentHistory calculation

          if (
            parseFloat(element.paymentHistory) == 0 ||
            paymentData.includes(parseFloat(element.paymentHistory))
          ) {
            console.log(
              `paymentHistory ${element.paymentHistory} is match for ${element.date}`
            );
          } else {
            storeResponse.push({
              error: `paymentHistory of ${element.paymentHistory} with paymentDate ${element.date} is not match with sheet`,
            });
          }
        }, 3000 * 1);
      });
    });

  // await page.click("#pdfClick");
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    location.reload(true);
  });
  await page.waitForTimeout(2000);
};

const createShareHolders = async (page, name, no) => {
  await page.waitForTimeout(1000);
  await page.click("#addShareHolderPer");
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
  await page.waitForTimeout(2000);
  await page.type("#percentage-0", "50", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#savePercent");
  await page.waitForTimeout(1000);
  await page.type("#percentage-1", "50", { delay: 50 });
  await page.waitForTimeout(1000);

  await page.click("#savePercent");
  await page.waitForTimeout(1000);

  await page.click("#save");
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
