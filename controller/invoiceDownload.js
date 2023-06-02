const puppeteer = require("puppeteer");
const AWS = require("aws-sdk");
const { sendEmail } = require("../sendEmail");
const { client } = require("./connection");
const { v4: uuidv4 } = require("uuid");
const bucket = process.env.BUCKET;

const s3 = new AWS.S3({
  endpoint: process.env.BUCKET_ENDPOINT,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});

const buildName = (name) => String(name).replace(/ /g, "");
const buildTimeStamp = () => {
  const dateAndTime = new Date().toISOString().split("T");
  return `${dateAndTime[0]}:${dateAndTime[1].split(":")[0]}`;
};

const uuid = uuidv4();
const seasonYear = new Date().getFullYear();
const URL = process.env.URL;
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

const InoviceDownload = async (req, res) => {
  const { orgName, customCustId, customPoId } = req.body;
  console.log(req.body.orgName, "----");
  console.log("Backup process start......");
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

  console.log(currentIndex, "currentIndex");
  async function login(index, selectedorgName) {
    console.log(selectedorgName, "selectedorgName in PDF");
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

      console.log(selectedorgName, "selectedorgName");
      // if (selectedorgName == null) {
      await listOrg[index].click();
      // } else {
      //   await page.waitForTimeout(1000);
      //   await page.waitForSelector(`#${selectedorgName}`);
      //   await page.click(`#${selectedorgName}`);
      // }
      await page.waitForTimeout(1000);

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

      const customersData = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:backupCustomerReducer");
        return JSON.parse(json);
      });
      const orgName = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:organizationReducer");
        return JSON.parse(json).name;
      });
      console.log("loaded", orgName);
      const orgId = await page.evaluate(() => {
        const json = localStorage.getItem("reduxPersist:organizationReducer");
        return JSON.parse(json).id;
      });
      console.log(orgId, "orgId");
      const isSpacificOrder = customPoId || customCustId ? true : false;
      const Allcustomers = customersData.backupCustomers;
      console.log(Allcustomers.length, "all customerlenght");
      for (let i = 0; i < Allcustomers.length; i++) {
        const custId = Allcustomers[i].id;
        const custName = Allcustomers[i].name;
        console.log(Allcustomers[i]["PurchaseOrders"].length, "lenght");
        if (!isSpacificOrder || custId === Number(customCustId)) {
          for (let j = 0; j < Allcustomers[i]["PurchaseOrders"].length; j++) {
            const poID = Allcustomers[i]["PurchaseOrders"][j].id;
            const poname = Allcustomers[i]["PurchaseOrders"][j].name;
            if (!isSpacificOrder || poID === Number(customPoId)) {
              try {
                await page.goto(
                  `${URL}/app/customers/${custId}/preview/${poID}`,
                  {
                    waitUntil: ["domcontentloaded", "networkidle0"],
                  }
                );
                const isQuote = Allcustomers[i]["PurchaseOrders"][j].isQuote;
                const orderType = isQuote == true ? "Quote" : "PO";
                console.log(isQuote, "isQuote");
                if (Allcustomers[i]["PurchaseOrders"][j].isSimple === false) {
                  await page.click("[data-test-id=shareholdersSelect]");
                  const listShareHolders = await page.$$(
                    "#menu- > div.MuiPaper-root.MuiMenu-paper.MuiPopover-paper.MuiPaper-elevation8.MuiPaper-rounded > ul > li"
                  );
                  for (const item of listShareHolders) {
                    try {
                      // const ddname = await (
                      //   await item.getProperty("innerText")
                      // ).jsonValue();

                      await page.setDefaultNavigationTimeout(0);

                      await page.evaluate((element) => {
                        element.click();
                      }, item);

                      const savePath = `pdf-backup/${uuid}/${orgId}/${orgName}/${custId}/${buildName(
                        custName
                      )}/${seasonYear}/${buildTimeStamp()}/${orderType}#${poID}(${poname}).pdf`;
                      console.log(savePath, "savepathhh");

                      await storePDF(
                        savePath,
                        poID,
                        orgId,
                        custId,
                        poname,
                        false
                      );
                    } catch (e) {
                      console.log(e);
                    }
                  }
                } else {
                  const savePath = `pdf-backup/${uuid}/${orgId}/${orgName}/${custId}/${buildName(
                    custName
                  )}/${seasonYear}/${buildTimeStamp()}/${orderType}#${poID}(${poname}).pdf`;

                  await storePDF(savePath, poID, orgId, custId, poname, false);
                }

                if (isQuote == false) {
                  const savePath = `pdf-backup/${uuid}/${orgId}/${orgName}/${custId}/${buildName(
                    custName
                  )}/${seasonYear}/${buildTimeStamp()}/Delivery#${poID}(${poname}).pdf`;
                  await page.goto(
                    `${URL}/app/customers/${custId}/delivery_preview/${poID}/print`,
                    {
                      waitUntil: ["domcontentloaded", "networkidle0"],
                    }
                  );
                  await page.waitForTimeout(1000);

                  await storePDF(savePath, poID, orgId, custId, poname, true);
                }
              } catch (error) {
                console.log("poID " + poID, error);
              }
            }
          }
        }
      }

      async function storePDF(
        savePath,
        poID,
        orgId,
        custId,
        poname,
        isDelivery
      ) {
        try {
          const pdfBuffer = await page.pdf({
            printBackground: true,
            format: "A4",
            PreferCSSPageSize: true,
          });

          await s3
            .upload({
              Bucket: bucket,
              Key: savePath,
              Body: pdfBuffer,
              ACL: "private",
            })
            .promise()
            .then((res) => {
              const url = s3.getSignedUrl("getObject", {
                Bucket: bucket,
                Key: savePath,
                Expires: 315360000,
              });
              console.log(url, "url");
              const query = {
                text: `INSERT INTO public."Backups"("organizationId", "customerId", "purchaseOrderId", "pdfLink", "seasonYear", "isDelivery", "createdAt", "updatedAt") 
                VALUES(${orgId},${custId}, ${poID},'${url}','${seasonYear}',${isDelivery},'${new Date().toDateString()}','${new Date().toDateString()}')`,
              };

              // callback
              client.query(query, (err, res) => {
                if (err) {
                  console.log("query error", err.stack);
                } else {
                  // console.log(res);
                  // console.log(res.rows[0]);
                  console.log("create Succesfully");
                }
              });
            });
          console.log("Your file has been uploaded successfully!", poID);
        } catch (error) {
          console.log("error from backup API", error);
          return res.status(500).json({ success: "False" });
        }
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

const SendInvoiceEmail = async (req, res) => {
  const {
    toEmails,
    subject,
    text,
    orgName,
    customCustId,
    customPoId,
    orgId,
    custName,
  } = req.body;
  const savePath = `pdf-backup/${buildName(
    orgName
  )}-${orgId}/${buildTimeStamp()}/${buildName(
    custName
  )}-${customCustId}/${customPoId}.pdf`;
  await s3
    .upload({
      Bucket: bucket,
      Key: savePath,
      Body: req.file.buffer,
      ACL: "public-read",
    })
    .promise();
  await sendEmail(toEmails.split(","), subject, text, null, [
    {
      content: req.file.buffer.toString("base64"),
      filename: req.file.originalname,
      type: req.file.mimetype,
      disposition: "attachment",
    },
  ]);
  res.send("done");
};

module.exports = { InoviceDownload, SendInvoiceEmail };
