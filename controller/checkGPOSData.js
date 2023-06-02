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
const checkGPOSData = async (req, res) => {
  const file = req.file;
  const bufferData = Buffer.from(file.buffer, "hex");
  console.log(file, "file");

  await fs.writeFileSync(
    path.join(__dirname, "../latestCsvGPOSData.csv"),
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

        let gposData = [];
        apiseedCompanys.map(async (apiseedCompany, i) => {
          setTimeout(async () => {
            zoneIds = JSON.parse(apiseedCompany.zoneIds);

            console.log(
              apiseedCompany.organizationId,

              "-----------------organizationId----------------------",
              apiseedCompany.technologyId
            );

            const q = {
              text: `SELECT "DeliveryReceipts".id,"dd"."purchaseOrderCreated","DeliveryReceipts"."organizationId","DeliveryReceipts"."purchaseOrderId","dd"."crossReferenceId","dd"."amountDelivered",mp."productDetail" FROM public."DeliveryReceipts" left outer Join "DeliveryReceiptDetails" dd on dd."deliveryReceiptId"="DeliveryReceipts".id left outer Join "MonsantoProducts" mp on mp."crossReferenceId"=dd."crossReferenceId" and mp."organizationId"=${apiseedCompany.organizationId} where "DeliveryReceipts"."organizationId"=${apiseedCompany.organizationId}`,
            };

            // console.log(q, " q ");
            await client.query(q, async (err, res2) => {
              if (err) {
                console.log(err.stack);
              } else {
                const deliveryData = res2.rows;

                const dataPath = path.resolve("latestCsvGPOSData.csv");
                let GPOSData = [];
                await fs
                  .createReadStream(dataPath)
                  .on("error", (err) => {
                    console.log(err, "---------------------------");
                    // handle error
                  })
                  .pipe(csvParser())
                  .on("data", async (row) => {
                    apiseedCompany.technologyId ==
                      row["Reported Ship From ID Value"] &&
                      gposData.push({
                        GTIN: row["Reported Product ID Value"],
                        qty: row["Current Qty"],
                        purchaseOrderCreate: row["Reported Invoice Number"],
                        dealerGLNId: row["Reported Ship From ID Value"],
                        productDetail: row["Product MON Description"],
                      });
                  })
                  .on("end", async () => {
                    gposData = gposData.filter(
                      (d) => d.dealerGLNId == apiseedCompany.technologyId
                    );
                    console.log(deliveryData[0], "9889+8", gposData[0]);
                    let finalData = [];
                    try {
                      const promise = new Promise(async (resolve, reject) => {
                        const csvGPOSNotInDB = gposData.filter(
                          ({ GTIN }) =>
                            !deliveryData.some(
                              ({ crossReferenceId }) =>
                                parseInt(crossReferenceId) == parseInt(GTIN)
                            )
                        );
                        const DBGPOSNotInCsv = deliveryData.filter(
                          ({ crossReferenceId }) =>
                            !gposData.some(
                              ({ GTIN }) =>
                                parseInt(crossReferenceId) == parseInt(GTIN)
                            )
                        );

                        const csvGPOSInDB = gposData.filter(({ GTIN }) =>
                          deliveryData.some(
                            ({ crossReferenceId }) =>
                              parseInt(crossReferenceId) == parseInt(GTIN)
                          )
                        );
                        const DBGPOSInCsv = deliveryData.filter(
                          ({ crossReferenceId }) =>
                            gposData.some(
                              ({ GTIN }) =>
                                parseInt(crossReferenceId) == parseInt(GTIN)
                            )
                        );
                        finalData = {
                          csvGPOSNotInDB: csvGPOSNotInDB,
                          DBGPOSNotInCsv: DBGPOSNotInCsv,
                          // csvGPOSInDB: csvGPOSInDB,
                          // DBGPOSInCsv: DBGPOSInCsv,
                        };

                        if (csvGPOSInDB.length > 0 && DBGPOSInCsv.length > 0) {
                          const csvGPOSPOCreateInDB = csvGPOSInDB.filter(
                            ({ GTIN, purchaseOrderCreate }) =>
                              !DBGPOSInCsv.some(
                                ({ crossReferenceId, purchaseOrderCreated }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  purchaseOrderCreated == purchaseOrderCreate
                              )
                          );

                          const DBGPOSPOCreateNotInCsv = DBGPOSInCsv.filter(
                            ({ crossReferenceId, purchaseOrderCreated }) =>
                              !csvGPOSInDB.some(
                                ({ GTIN, purchaseOrderCreate }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  purchaseOrderCreated == purchaseOrderCreate
                              )
                          );

                          const csvQtyNotInDB = csvGPOSInDB.filter(
                            ({ GTIN, qty }) =>
                              !DBGPOSInCsv.some(
                                ({ crossReferenceId, amountDelivered }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  parseFloat(amountDelivered) == parseFloat(qty)
                              )
                          );

                          const DBQtyNotInCsv = DBGPOSInCsv.filter(
                            ({ crossReferenceId, amountDelivered }) =>
                              !csvGPOSInDB.some(
                                ({ GTIN, qty }) =>
                                  parseInt(crossReferenceId) ==
                                    parseInt(GTIN) &&
                                  parseFloat(amountDelivered) == parseFloat(qty)
                              )
                          );

                          const finalGposPOCreate = [];
                          const finalQty = [];

                          csvGPOSPOCreateInDB.map((c) => {
                            const isFind = DBGPOSPOCreateNotInCsv.find(
                              (d) => d.crossReferenceId == c.GTIN
                            );

                            isFind &&
                              finalGposPOCreate.push({
                                ...c,
                                dbPoCreate: isFind.purchaseOrderCreated,
                                dbCrossRefId: isFind.crossReferenceId,
                              });
                          });
                          csvQtyNotInDB.map((c) => {
                            const isFind = DBQtyNotInCsv.find(
                              (d) => d.crossReferenceId == c.GTIN
                            );

                            isFind &&
                              finalQty.push({
                                ...c,
                                dbQty: isFind.amountDelivered,
                                dbCrossRefId: isFind.crossReferenceId,
                              });
                          });

                          finalData = {
                            ...finalData,
                            GposPOCreateDiffernce: finalGposPOCreate,
                            QtyDiffernce: finalQty,
                          };
                        }
                        resolve(
                          GPOSData.push({
                            [apiseedCompany.organizationId]: finalData,
                          })
                        );
                      });

                      Promise.all([promise]).then(() => {
                        fs.mkdir("./CSVGPOS", { recursive: true }, (error) => {
                          if (error) {
                            console.log(error);
                          } else {
                            console.log(
                              "New Directory created successfully !!"
                            );
                            fs.writeFile(
                              `./CSVGPOS/organizationId-${apiseedCompany.organizationId}.json`,
                              JSON.stringify(GPOSData),
                              function (err) {
                                if (err) {
                                  console.log(err);
                                } else {
                                  fs.readFile(
                                    `./CSVGPOS/organizationId-${apiseedCompany.organizationId}.json`,
                                    "utf8",
                                    (err, data) => {
                                      if (data) {
                                        s3.upload({
                                          Bucket: bucket,
                                          Key: `checkGPOSFromCSV/${
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
                                  GPOSData = [];
                                }
                              }
                            );
                          }
                        });

                        // console.log('complete the promise', priceSheetRes);
                        // return res.status(200).json(priceSheetRes);
                      });
                    } catch (e) {
                      console.log(e, "error from ship notice API");
                    }
                  });

                // console.log(GPOSData, "GPOSData");
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

module.exports = { checkGPOSData };
