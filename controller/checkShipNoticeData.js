const axios = require("axios");
const { client } = require("./connection");
const AWS = require("aws-sdk");
var os = require("os");

const path = require("path");
const fs = require("fs");
const csvParser = require("csv-parser");
const bucket = process.env.BUCKET;
const s3 = new AWS.S3({
  endpoint: process.env.BUCKET_ENDPOINT,

  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});
const checkShipNoticeData = async (req, res) => {
  const file = req.file;
  const bufferData = Buffer.from(file.buffer, "hex");
  console.log(file, "file");

  await fs.writeFileSync(
    path.join(__dirname, "../latestCSVShipNoticeData.csv"),
    bufferData.toString()
  );

  try {
    const query = {
      text: `SELECT * FROM public."ApiSeedCompanies"
        ORDER BY id ASC `,
    };

    client.query(query, async (err, res2) => {
      if (err) {
        console.log(err.stack);
      } else {
        const apiseedCompanys = res2.rows;
        console.log(apiseedCompanys.length, "-----------------------");
        let shipNoticeData = [];
        apiseedCompanys.map(async (apiseedCompany, i) => {
          setTimeout(async () => {
            zoneIds = JSON.parse(apiseedCompany.zoneIds);

            console.log(
              apiseedCompany.organizationId,
              "-----------------organizationId----------------------",
              apiseedCompany.csvOrganizationName
            );

            const q = {
              text: `SELECT ml."crossReferenceId", mp."productDetail", ml.id,ml."netWeight",ml."quantity",ml."lotNumber" FROM "MonsantoLots" ml 
              left outer join "MonsantoProducts" mp on mp."crossReferenceId" = ml."crossReferenceId"  and mp."organizationId" =${apiseedCompany.organizationId}
              where  ml."organizationId"=${apiseedCompany.organizationId}`,
            };

            client.query(q, async (err, res2) => {
              if (err) {
                console.log(err.stack);
              } else {
                const monsantoLotProducts = res2.rows;
                console.log(monsantoLotProducts[0]);

                const dataPath = path.resolve("latestCSVShipNoticeData.csv");

                await fs
                  .createReadStream(dataPath)
                  .on("error", (err) => {
                    console.log(err, "---------------------------");
                    // handle error
                  })
                  .pipe(csvParser())
                  .on("data", async (row) => {
                    apiseedCompany.csvOrganizationName ==
                      row["Name of sold-to party"] &&
                      shipNoticeData.push({
                        GTIN: row.GTIN,
                        Batch: row.Batch,
                        netWeightCsv: row["Net weight"],
                        qty: row["Delivery quantity"],
                        Description: row.Description,
                        BillingDocument: row["Billing Document"],
                        deliveryDate: row["Deliv. date(From/to)"],
                        orgName: row["Name of sold-to party"],
                      });
                  })
                  .on("end", async () => {
                    try {
                      let finalData = [];
                      let shipNotice = [];
                      shipNoticeData.filter(
                        (d) => d.orgName == apiseedCompany.csvOrganizationName
                      );
                      const promise = new Promise(async (resolve, reject) => {
                        const csvLotNotInDB = shipNoticeData.filter(
                          ({ GTIN }) =>
                            !monsantoLotProducts.some(
                              ({ crossReferenceId }) =>
                                parseInt(crossReferenceId) == parseInt(GTIN)
                            )
                        );
                        const DBLotNotInCsv = monsantoLotProducts.filter(
                          ({ crossReferenceId }) =>
                            !shipNoticeData.some(
                              ({ GTIN }) =>
                                parseInt(crossReferenceId) == parseInt(GTIN)
                            )
                        );

                        finalData = {
                          csvLotNotInDB: csvLotNotInDB,
                          DBLotNotInCsv: DBLotNotInCsv,
                        };

                        const csvLotInDB = shipNoticeData.filter(({ GTIN }) =>
                          monsantoLotProducts.some(
                            ({ crossReferenceId }) =>
                              parseInt(crossReferenceId) == parseInt(GTIN)
                          )
                        );
                        const DBLotInCsv = monsantoLotProducts.filter(
                          ({ crossReferenceId }) =>
                            shipNoticeData.some(
                              ({ GTIN }) =>
                                parseInt(crossReferenceId) == parseInt(GTIN)
                            )
                        );

                        if (csvLotInDB.length > 0 && DBLotInCsv.length > 0) {
                          const csvLotNumberNotInDB = csvLotInDB.filter(
                            ({ GTIN, Batch }) =>
                              !DBLotInCsv.some(
                                ({ crossReferenceId, lotNumber }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  (lotNumber == null ? "" : lotNumber) == Batch
                              )
                          );

                          const DBLotNumberNotInCsv = DBLotInCsv.filter(
                            ({ crossReferenceId, lotNumber }) =>
                              !csvLotInDB.some(
                                ({ GTIN, Batch }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  (lotNumber == null ? "" : lotNumber) == Batch
                              )
                          );

                          const csvQtyNotInDB = csvLotInDB.filter(
                            ({ GTIN, qty }) =>
                              !DBLotInCsv.some(
                                ({ crossReferenceId, quantity }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  parseFloat(quantity) == parseFloat(qty)
                              )
                          );

                          const DBQtyNotInCsv = DBLotInCsv.filter(
                            ({ crossReferenceId, quantity }) =>
                              !csvLotInDB.some(
                                ({ GTIN, qty }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  parseFloat(quantity) == parseFloat(qty)
                              )
                          );

                          const csvnetWeightNotInDB = csvLotInDB.filter(
                            ({ GTIN, netWeightCsv }) =>
                              !DBLotInCsv.some(
                                ({ crossReferenceId, netWeight }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  parseFloat(netWeight.split("LBR")[0]) ==
                                    parseFloat(netWeightCsv.replace(",", ""))
                              )
                          );

                          const DBnetWeightNotInCsv = DBLotInCsv.filter(
                            ({ crossReferenceId, netWeight }) =>
                              !csvLotInDB.some(
                                ({ GTIN, netWeightCsv }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  parseFloat(netWeight.split("LBR")[0]) ==
                                    parseFloat(netWeightCsv.replace(",", ""))
                              )
                          );

                          const finalLotNumber = [];
                          const finalQty = [];
                          const finalnetWeight = [];

                          csvLotNumberNotInDB.map((c) => {
                            const isFind = DBLotNumberNotInCsv.find(
                              (d) =>
                                parseInt(d.crossReferenceId) == parseInt(c.GTIN)
                            );

                            isFind &&
                              finalLotNumber.push({
                                ...c,
                                dbLotNumber: isFind.lotNumber,
                                dbCrossRefId: isFind.crossReferenceId,
                              });
                          });
                          csvQtyNotInDB.map((c) => {
                            const isFind = DBQtyNotInCsv.find(
                              (d) =>
                                parseInt(d.crossReferenceId) == parseInt(c.GTIN)
                            );

                            isFind &&
                              finalQty.push({
                                ...c,
                                dbQty: isFind.quantity,
                                dbCrossRefId: isFind.crossReferenceId,
                              });
                          });
                          csvnetWeightNotInDB.map((c) => {
                            const isFind = DBnetWeightNotInCsv.find(
                              (d) =>
                                parseInt(d.crossReferenceId) == parseInt(c.GTIN)
                            );

                            isFind &&
                              finalnetWeight.push({
                                ...c,
                                dbNetWeight: isFind.netWeight.split("LBR")[0],
                                dbCrossRefId: isFind.crossReferenceId,
                              });
                          });

                          finalData = {
                            ...finalData,
                            LotNumberDiffernce: finalLotNumber,
                            QtyDiffernce: finalQty,
                            NetWeightDiffernce: finalnetWeight,
                          };
                        }
                        resolve(
                          shipNotice.push({
                            [apiseedCompany.organizationId]: finalData,
                          })
                        );
                      });
                      Promise.all([promise]).then(() => {
                        fs.mkdir(
                          "./CSVShipNotice",
                          { recursive: true },
                          (error) => {
                            if (error) {
                              console.log(error);
                            } else {
                              console.log(
                                "New Directory created successfully !!"
                              );
                              fs.writeFile(
                                `./CSVShipNotice/organizationId-${apiseedCompany.organizationId}.json`,
                                JSON.stringify(shipNotice),
                                function (err) {
                                  if (err) {
                                    console.log(err);
                                  } else {
                                    fs.readFile(
                                      `./CSVShipNotice/organizationId-${apiseedCompany.organizationId}.json`,
                                      "utf8",
                                      (err, data) => {
                                        if (data) {
                                          s3.upload({
                                            Bucket: bucket,
                                            Key: `checkShipNoticeFromCSV/${
                                              apiseedCompany.organizationId
                                            }/${new Date()}/organizationId-${
                                              apiseedCompany.organizationId
                                            }.json`,
                                            Body: data,
                                            ACL: "public-read",
                                          })
                                            .promise()
                                            .then((res) => {
                                              console.log(
                                                "helllllo",
                                                "--------",
                                                res
                                              );
                                            })
                                            .catch((e) => {
                                              console.log(e, "e");
                                              // return res.status(500).json({ success: "False" });
                                            });
                                        }
                                      }
                                    );
                                    console.log("The file was saved!");
                                    console.log("priceSheet none");
                                    shipNotice = [];
                                  }
                                }
                              );
                            }
                          }
                        );

                        // console.log('complete the promise', priceSheetRes);
                        // return res.status(200).json(priceSheetRes);
                      });
                    } catch (e) {
                      console.log(e, "error from ship notice API");
                    }
                  });

                // console.log(shipNotice, "shipNotice");
                if (apiseedCompanys && i == apiseedCompanys.length - 1) {
                  return res.status(200).json({ checking: "Done" });
                }
              }
            });
          }, 6000 * i);
        });
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error });
  }
};

module.exports = { checkShipNoticeData };

const dbList = () => {
  const query = {
    text: `SELECT "csvOrganizationName" FROM public."ApiSeedCompanies"
    ORDER BY id ASC`,
  };
  const shipNoticeData = [];
  client.query(query, async (err, res2) => {
    if (err) {
      console.log(err.stack);
    } else {
      console.log(res2.rows, "res2");
      const DBorg = [
        ...new Set(
          res2.rows.map((item) =>
            item.csvOrganizationName !== null
              ? item.csvOrganizationName.toLocaleUpperCase()
              : null
          )
        ),
      ];

      const dataPath = path.resolve("latestCSVShipNoticeData.csv");

      await fs
        .createReadStream(dataPath)
        .on("error", (err) => {
          console.log(err, "---------------------------");
          // handle error
        })
        .pipe(csvParser())
        .on("data", async (row) => {
          shipNoticeData.push({
            orgId: row["Name of sold-to party"],
          });
        })
        .on("end", async () => {
          const unique = [...new Set(shipNoticeData.map((item) => item.orgId))];
          // console.log(unique.length, "shipNoticeData", DBorg.length);
          const idFind = unique.filter((element) => DBorg.includes(element));
          console.log(unique.length, "idFind");
        });
    }
  });
};
// dbList();
