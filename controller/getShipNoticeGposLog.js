const path = require("path");
const fs = require("fs");
const csvParser = require("csv-parser");
const { client } = require("./connection");

const getShipNoticeGposLog = async (req, res) => {
  console.log(req.query, "-----------");
  const type = req.query.hasOwnProperty("filterTypeShipNotice")
    ? req.query.filterTypeShipNotice
    : req.query.filterTypeGPOS;

  const folderName = req.query.hasOwnProperty("filterTypeShipNotice")
    ? "CSVShipNotice"
    : "CSVGPOS";

  try {
    const data = await fs.readFileSync(
      path.join(
        __dirname,
        `../${folderName}/organizationId-${parseInt(type)}.json`
      ),
      { encoding: "utf8" }
    );

    const NotMatchData = JSON.parse(data)[0][type];
    // console.log(NotMatchData, "NotMatchData");

    const csvValue = NotMatchData.hasOwnProperty("csvLotNotInDB")
      ? NotMatchData.csvLotNotInDB
      : NotMatchData.csvGPOSNotInDB;
    const dbValue = NotMatchData.hasOwnProperty("DBLotNotInCsv")
      ? NotMatchData.DBLotNotInCsv
      : NotMatchData.DBGPOSNotInCsv;

    const query = {
      text: `SELECT * FROM public."Organizations" where id=${
        type == undefined ? req.query.filterTypeCron.split("-")[2] : type
      }  ORDER BY id ASC `,
    };
    const MatchDataKeys = Object.keys(NotMatchData).filter(
      (d) =>
        d !== "csvGPOSNotInDB" &&
        d !== "DBGPOSNotInCsv" &&
        d !== "csvLotNotInDB" &&
        d !== "DBLotNotInCsv"
    );

    client.query(query, async (err, res2) => {
      if (err) {
        console.log(err.stack);
      } else {
        console.log(
          res2.rows[0].name,
          "organizationName",
          Object.keys(NotMatchData)
        );

        res.render("showLogOfCheckGPOS&ShipNotice", {
          organizationId: `${type} - ${res2.rows[0].name}`,

          NotMatchData: NotMatchData,
          MatchDataKeys: MatchDataKeys,

          CSVDataHeader: csvValue.length > 0 ? Object.keys(csvValue[0]) : [],
          DBDataHeader: dbValue.length > 0 ? Object.keys(dbValue[0]) : [],
        });
      }
    });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).json({
      error: error,
      ErrorMSG:
        "Please first choose file and compare the Data after that check on logs",
    });
  }
};

module.exports = { getShipNoticeGposLog };
