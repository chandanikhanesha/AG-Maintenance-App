require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { Pool } = require("pg");

const { compareResult, start } = require("./controller/comparion");
const { checkCrashed, getCrashedReport } = require("./controller/checkCrashed");
const { checkPo } = require("./controller/poCheck");
const { apiLogs } = require("./controller/apiLogs");
const { dbLogs } = require("./controller/dbLogs");
const { bayerOrderCheck } = require("./controller/bayerOrderCheck");
const cookieParser = require("cookie-parser");

const {
  InoviceDownload,
  SendInvoiceEmail,
} = require("./controller/invoiceDownload");
const Login = require("./controller/Login");
const { client, client2 } = require("./controller/connection");
const { discountReport } = require("./controller/discountReport");
const DowanloadCsv = require("./controller/downloadCSV");
const ResetAllTable = require("./controller/resetAllTables");
const { HardCodeTest, signUpUser } = require("./controller/hardCodeTest");
const addCsvOrgData = require("./controller/addCsvOrgData");
const { listZones } = require("./controller/listZones");
const {
  createTopic,
  getTopic,
  createSubTopic,
} = require("./controller/createTopic");
const { deleteTopic, deleteSubTopic } = require("./controller/deleteTopic");
const { editTopic, editsubTopic } = require("./controller/editTopic");
const superAdmin = require("./controller/superAdmin");
const updateAllTurorial = require("./controller/updateAllTurorial");
const updateTopic = require("./controller/updateTopic");
const { checkPaymentCalculation } = require("./controller/EarlyPayPayment");
const { checkPriceCSVSheetData } = require("./controller/checkCsvPriceSheet");
const { checkShipNoticeData } = require("./controller/checkShipNoticeData");
const { checkGPOSData } = require("./controller/checkGPOSData");
const { getCsvpriceSheetData } = require("./controller/getCsvpriceSheetData");
const { getShipNoticeGposLog } = require("./controller/getShipNoticeGposLog");

const {
  checkFailTest,
  wrongLogInTest,
  wrongBayerConnectivity,
} = require("./controller/checkFailTest");

const app = express();
app.use(cors());
app.use(cookieParser());

app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//DB connection
client.connect((err) => {
  if (err) {
    console.error("connection error", err.stack);
  } else {
    console.log(
      `connected to - ${process.env.PRODUCT_DATABASE_NAME}  - DB Succesfully`
    );
  }
});
client2.connect((err) => {
  if (err) {
    console.error("connection error", err.stack);
  } else {
    console.log(
      `connected to - ${process.env.API_DB_DATABASE_NAME}  - DB Succesfully`
    );
  }
});

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
  res.clearCookie("isLogging");

  res.render("index");
});
let allTopics = [];
let allData = [];

const allQuery = {
  text: `SELECT * FROM public."TutorialTopics" `,
};
client.query(allQuery, async (err, res2) => {
  if (err) {
    console.log(err.stack);
  } else {
    const unique = [
      ...new Map(res2.rows.map((item) => [item["topicOrder"], item])).values(),
    ];
    allTopics = unique;

    allData = res2.rows;
  }
});
app.get("/topicForm", async (req, res) => {
  res.render("topicForm", {
    error: undefined,
    topicOrder: allTopics,
    allTopicData: allData,
  });
});

app.get("/createTopic", async (req, res) => {
  res.render("topicForm", {
    error: undefined,
    topicOrder: allTopics,
    allTopicData: allData,
  });
});
app.get("/createSubTopic", async (req, res) => {
  res.render("topicForm", {
    error: undefined,
    topicOrder: allTopics,
    allTopicData: allData,
  });
});

app.get("/login", async (req, res) => {
  console.log(req.cookies.isLogging, "----req.cookies");
  if (req.cookies.isLogging == process.env.EMAIL) {
    const query = {
      text: `SELECT "ApiSeedCompanies".id, "ApiSeedCompanies"."organizationId",o."name"
      FROM public."ApiSeedCompanies"
left outer join "Organizations" o on o.id="ApiSeedCompanies"."organizationId"`,
    };
    let Organization = [];

    await client.query(query, async (err, res2) => {
      if (err) {
        console.log(err.stack);
      } else {
        await Promise.all(
          res2.rows.map(async (organization) => {
            Organization.push({
              id: organization.organizationId,
              name: organization.name,
            });
          })
        ).then(() => {
          res.render("test", {
            data: [],
            organizationData: Organization,
            error: false,
          });
        });
      }
    });
  } else {
    res.render("index");
  }
});

app.post("/compare-start", async (req, res) => {
  try {
    const { IsBefore, orgName } = req.body;
    await start(IsBefore, orgName);
    res.redirect("/compare-result");
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

app.delete("/resetAllTable", ResetAllTable);
app.post("/login", Login);
app.get("/compare-result", compareResult);
app.post("/checkCrashed", checkCrashed);
app.get("/addCsvOrgData", addCsvOrgData);
app.post(
  "/checkPriceCSVSheetData",
  upload.single("myFile"),
  checkPriceCSVSheetData
);
app.post("/checkGPOSData", upload.single("myFile"), checkGPOSData);

app.post("/checkShipNoticeData", upload.single("myFile"), checkShipNoticeData);
app.get("/checkPaymentCalculation", checkPaymentCalculation);
app.get("/getShipNoticeGposLog", getShipNoticeGposLog);

app.get("/getCsvpriceSheetData", getCsvpriceSheetData);
app.get("/hardCodeTest", HardCodeTest);
app.post("/discountReport", discountReport);
app.post("/downloadCsv", DowanloadCsv);
app.post("/inovice-download", InoviceDownload);
app.post("/send-invoice-email", upload.single("pdfFile"), SendInvoiceEmail);
app.get("/getCrashedReport", getCrashedReport);
app.get("/poCheck", checkPo);
app.get("/apiLogs", apiLogs);
app.get("/dbLogs", dbLogs);
app.get("/listZones", listZones);
app.get("/checkFailTest", checkFailTest);
app.get("/wrongLogInTest", wrongLogInTest);
app.get("/wrongBayerConnectivity", wrongBayerConnectivity);
app.get("/signUpUser", signUpUser);
app.post("/bayerOrderCheck", bayerOrderCheck);
app.post("/createTopic", createTopic);
app.get("/getTopic", getTopic);
app.patch("/editTopic", editTopic);
app.patch("/editsubTopic", editsubTopic);

app.post("/createSubTopic", createSubTopic);
app.get("/superAdmin", superAdmin);
app.get("/updateAllTurorial", updateAllTurorial);
app.get("/updateTopic", updateTopic);

app.delete("/deleteTopic", deleteTopic);
app.delete("/deleteSubTopic", deleteSubTopic);

app.listen(4000, () => {
  console.log("server started on port 4000");
});
