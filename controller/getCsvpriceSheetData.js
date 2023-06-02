const axios = require("axios");
const { client } = require("./connection");
const AWS = require("aws-sdk");
var os = require("os");

const path = require("path");
const fs = require("fs");
const csvParser = require("csv-parser");

const getCsvpriceSheetData = async (req, res) => {
  console.log(req.query, "-----------");
  const type = req.query.filterTypePriceSheet;

  const folderName = "CSVPriceSheetData";

  try {
    const data = await fs.readFileSync(
      path.join(
        __dirname,
        `../${
          req.query.hasOwnProperty("filterTypeCron")
            ? "CSVPriceSheetData"
            : folderName
        }/organizationId-${parseInt(
          type == undefined ? req.query.filterTypeCron.split("-")[2] : type
        )}.json`
      ),
      { encoding: "utf8" }
    );

    console.log(JSON.parse(data).length, "-----------------");
    const keysData = [];
    JSON.parse(data).map((d, i) => {
      const dd = Object.keys(JSON.parse(data)[i])[0];
      keysData.push(dd);
    });

    const query = {
      text: `SELECT * FROM public."Organizations" where id=${
        type == undefined ? req.query.filterTypeCron.split("-")[2] : type
      }
        ORDER BY id ASC `,
    };

    const currentZone =
      type == undefined ? req.query.filterTypeCron : keysData[0];

    const filterData = JSON.parse(data).filter((d) => d[currentZone]);
    // console.log(filterData[0][currentZone][0], "filterData");
    const NotMatchData = filterData[0][currentZone][0];
    const MatchData =
      filterData[0][currentZone].length > 1
        ? filterData[0][currentZone][1]
        : [];
    client.query(query, async (err, res2) => {
      if (err) {
        console.log(err.stack);
      } else {
        console.log(res2.rows[0].name, "res2");
        res.render("showLogOfCheckPriceSheet", {
          NotMatchData: NotMatchData,
          MatchData: MatchData,
          MatchDataKeys: Object.keys(MatchData),
          CSVDataHeader:
            NotMatchData.CSVProductNotInDB.length > 0
              ? Object.keys(NotMatchData.CSVProductNotInDB[0])
              : [],
          DBDataHeader:
            NotMatchData.DBProductNotInCSV.length > 0
              ? Object.keys(NotMatchData.DBProductNotInCSV[0])
              : [],
          organizationId: `${
            type == undefined ? req.query.filterTypeCron.split("-")[2] : type
          } - ${res2.rows[0].name}`,
          keysData: keysData,
          currentZone: currentZone,
        });
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error,
      ErrorMSG:
        "Please first choose file and compare the Data after that check on logs",
    });
  }
};

module.exports = { getCsvpriceSheetData };
