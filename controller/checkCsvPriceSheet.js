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
const checkPriceCSVSheetData = async (req, res) => {
  const file = req.file;
  const bufferData = Buffer.from(file.buffer, "hex");

  await fs.writeFileSync(
    path.join(__dirname, "../latestCSVpriceSheetData.csv"),
    bufferData.toString()
  );

  try {
    let priceSheetRes = [];
    const fetchPricesheetData = async (
      company,
      cropType,
      zoneId,
      seedDealerMonsantoId,
      seedCompanyId,
      organizationId,
      zoneIdLength,
      index
    ) => {
      const promise = new Promise(async (resolve, reject) => {
        const query = {
          text: `select mp.id, mp."productDetail",mp."classification" ,mp.id,mp."brand",mp."blend",mp."treatment",mpl."productId" ,mp."zoneId",mp."crossReferenceId",
          mpl."suggestedDealerPrice",mpl."suggestedEndUserPrice",mpl."upcCode"
           from "MonsantoProducts" mp
              left outer Join "MonsantoProductLineItems" mpl on mpl."organizationId" =${organizationId} and mpl."productId"=mp.id
          where mp."organizationId"=${organizationId} and mp."classification"='${cropType}' and mp."zoneId"='{${`${
            zoneId.toString() == "*" ? "NZI" : zoneId.toString()
          }`}}'`,
        };

        await client.query(query, async (err, res2) => {
          if (err) {
            console.log(err.stack);
          } else {
            const dbProducts = res2.rows;

            const finalData = [];
            const dataPath = path.resolve("latestCSVpriceSheetData.csv");

            const productLineItems = [];

            await fs
              .createReadStream(dataPath)
              .on("error", (err) => {
                console.log(err, "---------------------------");
                // handle error
              })
              .pipe(csvParser())
              .on("data", async (row) => {
                // console.log(row, "row");
                // console.log(zoneId, 'zoneId');
                if (
                  row.Specie == cropType &&
                  (row["ZONE CODE"] == ""
                    ? "NZI" == zoneId
                    : row["ZONE CODE"] == zoneId)
                ) {
                  productLineItems.push({
                    ...row,
                    GTIN: `00${row.GTIN}`,
                    ZONECODE: row["ZONE CODE"] == "" ? "NZI" : zoneId,
                  });
                }
              })
              .on("end", async () => {
                console.log(
                  productLineItems.length,
                  "productLineItems",
                  cropType,
                  zoneId
                );

                try {
                  const productIDs = new Set();
                  const apiProducts = [];
                  const productCrossRefIds = [];
                  const lineItemUserPrice = [];

                  productLineItems
                    .filter((d) => d.Specie == cropType)
                    .forEach((lineItem) => {
                      lineItemUserPrice.push({
                        suggestedEndUserPrice: lineItem["Grower price"],
                        suggestedDealerPrice: lineItem["Dealer Price"],
                        crossReferenceProductId: lineItem.GTIN,
                      });
                      if (!productIDs.has(lineItem.GTIN)) {
                        productIDs.add(lineItem.GTIN);
                        apiProducts.push(lineItem);
                        productCrossRefIds.push(lineItem.GTIN);
                      }
                    });

                  const CSVProductNotInDB = apiProducts.filter(
                    ({ GTIN, ZONECODE: AzoneId }) =>
                      !dbProducts.some(
                        ({ crossReferenceId, zoneId: DzoneId }) =>
                          parseInt(crossReferenceId) === parseInt(GTIN) &&
                          AzoneId ==
                            (Array.isArray(DzoneId[0]) ? DzoneId[0] : DzoneId)
                      )
                  );
                  const DBProductNotInCSV = dbProducts.filter(
                    ({ crossReferenceId, zoneId: DzoneId }) =>
                      !apiProducts.some(
                        ({ GTIN, ZONECODE: AzoneId }) =>
                          parseInt(crossReferenceId) === parseInt(GTIN) &&
                          AzoneId ==
                            (Array.isArray(DzoneId[0]) ? DzoneId[0] : DzoneId)
                      )
                  );
                  const BothSameDB = dbProducts.filter(
                    ({ crossReferenceId, zoneId: DzoneId }) =>
                      apiProducts.some(
                        ({ GTIN, ZONECODE: AzoneId }) =>
                          parseInt(crossReferenceId) === parseInt(GTIN) &&
                          AzoneId ==
                            (Array.isArray(DzoneId[0]) ? DzoneId[0] : DzoneId)
                      )
                  );
                  const BothSameCSV = apiProducts.filter(
                    ({ GTIN, ZONECODE: AzoneId }) =>
                      dbProducts.some(
                        ({ crossReferenceId, zoneId: DzoneId }) =>
                          parseInt(crossReferenceId) === parseInt(GTIN) &&
                          AzoneId ==
                            (Array.isArray(DzoneId[0]) ? DzoneId[0] : DzoneId)
                      )
                  );
                  finalData.push({
                    CSVProductNotInDB: CSVProductNotInDB,
                    DBProductNotInCSV: DBProductNotInCSV,
                  });
                  console.log(BothSameDB.length, "BothSameDB");

                  //we've to cehck UPCCode ,Description[productDetail] ,TraitDescription [brand],TreatmentDescription ,AcronymName[blend]
                  if (BothSameDB.length > 0 && BothSameCSV.length > 0) {
                    const CSVUserPriceNotInDB = BothSameCSV.filter(
                      (id1) =>
                        !BothSameDB.some(
                          (id2) =>
                            parseInt(id2.crossReferenceId) ===
                              parseInt(id1.GTIN) &&
                            parseFloat(id1["Grower price"]) ===
                              parseFloat(
                                Object.values(
                                  JSON.parse(id2.suggestedEndUserPrice || 0)
                                )[0]
                              ) &&
                            parseFloat(id1["Dealer Price"]) ===
                              parseFloat(
                                Object.values(
                                  JSON.parse(id2.suggestedDealerPrice || 0)
                                )[0]
                              )
                        )
                    );

                    const DBUserPriceNotInCSV = BothSameDB.filter(
                      (id2) =>
                        !BothSameCSV.some(
                          (id1) =>
                            parseInt(id2.crossReferenceId) ===
                              parseInt(id1.GTIN) &&
                            parseFloat(id1["Grower price"]) ===
                              parseFloat(
                                Object.values(
                                  JSON.parse(id2.suggestedEndUserPrice || 0)
                                )[0]
                              ) &&
                            parseFloat(id1["Dealer Price"]) ===
                              parseFloat(
                                Object.values(
                                  JSON.parse(id2.suggestedDealerPrice || 0)
                                )[0]
                              )
                        )
                    );

                    const CSVProdcutDetailNotInDB = BothSameCSV.filter(
                      (id1) =>
                        !BothSameDB.some(
                          (id2) =>
                            parseInt(id2.crossReferenceId) ===
                              parseInt(id1.GTIN) &&
                            id2.productDetail == id1.Description
                        )
                    );
                    const DBProdcutDetailNotInCSV = BothSameDB.filter(
                      (id2) =>
                        !BothSameCSV.some(
                          (id1) =>
                            parseInt(id2.crossReferenceId) ===
                              parseInt(id1.GTIN) &&
                            id2.productDetail == id1.Description
                        )
                    );
                    const CSVTraitNotInDB = BothSameCSV.filter(
                      (id1) =>
                        !BothSameDB.some(
                          (id2) =>
                            parseInt(id2.crossReferenceId) ===
                              parseInt(id1.GTIN) &&
                            id2.blend == id1["Acronym Name"]
                        )
                    );
                    const DBTraitNotInCSV = BothSameDB.filter(
                      (id2) =>
                        !BothSameCSV.some(
                          (id1) =>
                            parseInt(id2.crossReferenceId) ===
                              parseInt(id1.GTIN) &&
                            id2.blend == id1["Acronym Name"]
                        )
                    );

                    const CSVTreatmentNotInDB = BothSameCSV.filter(
                      (id1) =>
                        !BothSameDB.some(
                          (id2) =>
                            parseInt(id2.crossReferenceId) ===
                              parseInt(id1.GTIN) &&
                            id2.treatment == id1["Treatment Description"]
                        )
                    );
                    const DBTreatmentNotInCSV = BothSameDB.filter(
                      (id2) =>
                        !BothSameCSV.some(
                          (id1) =>
                            parseInt(id2.crossReferenceId) ===
                              parseInt(id1.GTIN) &&
                            id2.treatment == id1["Treatment Description"]
                        )
                    );

                    const finalTreatment = [];
                    const finalTrait = [];
                    const finalProductDetail = [];
                    const finalUserprice = [];

                    CSVTreatmentNotInDB.map((c) => {
                      const isFind = DBTreatmentNotInCSV.find(
                        (d) => d.crossReferenceId == c.GTIN
                      );

                      finalTreatment.push({
                        ...c,
                        dbTreatment: isFind.treatment,
                        dbCrossRefId: isFind.crossReferenceId,
                      });
                    });

                    CSVTraitNotInDB.map((c) => {
                      const isFind = DBTraitNotInCSV.find(
                        (d) => d.crossReferenceId == c.GTIN
                      );

                      finalTrait.push({
                        ...c,
                        dbTrait: isFind.blend,
                        dbCrossRefId: isFind.crossReferenceId,
                      });
                    });

                    CSVProdcutDetailNotInDB.map((c) => {
                      const isFind = DBProdcutDetailNotInCSV.find(
                        (d) => d.crossReferenceId == c.GTIN
                      );

                      finalProductDetail.push({
                        ...c,
                        dbProductDetail: isFind.productDetail,
                        dbCrossRefId: isFind.crossReferenceId,
                      });
                    });
                    CSVUserPriceNotInDB.map((c) => {
                      const isFind = DBUserPriceNotInCSV.find(
                        (d) => d.crossReferenceId == c.GTIN
                      );

                      finalUserprice.push({
                        ...c,
                        dbCrossRefId: isFind.crossReferenceId,

                        dbGrowerPrice: isFind.parseFloat(
                          Object.values(
                            JSON.parse(id2.suggestedEndUserPrice || 0)
                          )[0]
                        ),
                        dbDealerPrice: isFind.parseFloat(
                          Object.values(
                            JSON.parse(id2.suggestedDealerPrice || 0)
                          )[0]
                        ),
                      });
                    });

                    finalData.push({
                      UserPriceDiffernce: finalUserprice,
                      TraitDiffernce: finalTrait,
                      ProductDetailDiffernce: finalProductDetail,
                      TreatmentDiffernce: finalTreatment,
                    });
                  }

                  priceSheetRes.push({
                    [`${cropType}-${zoneId}-${organizationId}`]: finalData,
                  });
                  console.log(priceSheetRes.length, "*******", zoneIdLength);

                  if (index == zoneIdLength - 1) {
                    console.log("resolve the function ");
                    resolve();
                  }
                } catch (e) {
                  console.log(e);
                }
              });
          }
        });
      });

      Promise.all([promise]).then(() => {
        fs.mkdir("./CSVPriceSheetData", { recursive: true }, (error) => {
          if (error) {
            console.log(error);
          } else {
            console.log("New Directory created successfully !!");
            fs.writeFile(
              `./CSVPriceSheetData/organizationId-${organizationId}.json`,
              JSON.stringify(priceSheetRes),
              function (err) {
                if (err) {
                  console.log(err);
                } else {
                  fs.readFile(
                    `./CSVPriceSheetData/organizationId-${organizationId}.json`,
                    "utf8",
                    (err, data) => {
                      if (data) {
                        s3.upload({
                          Bucket: bucket,
                          Key: `checkPriceSheetFromCSV/${organizationId}/${new Date()}/organizationId-${organizationId}.json`,
                          Body: data,
                          ACL: "public-read",
                        })
                          .promise()
                          .then((res) => {
                            console.log("helllllo", "--------", res);
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
                  priceSheetRes = [];
                }
              }
            );
          }
        });

        // console.log('complete the promise', priceSheetRes);
        // return res.status(200).json(priceSheetRes);
      });
    };

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

        apiseedCompanys.map(async (apiseedCompany, i) => {
          const finalZoneId = [];
          setTimeout(async () => {
            zoneIds = JSON.parse(apiseedCompany.zoneIds);

            console.log(
              apiseedCompany.organizationId,
              "-----------------organizationId----------------------"
            );

            zoneIds.map((z) => {
              if (Array.isArray(z.zoneId)) {
                z.zoneId.map((zi) =>
                  finalZoneId.push({
                    classification: z.classification,
                    zoneId: zi,
                  })
                );
              } else {
                finalZoneId.push({
                  classification: z.classification,
                  zoneId: z.zoneId,
                });
              }
            });

            await Promise.all(
              finalZoneId.map(async (item, i) => {
                const cropType = item.classification;

                const starZoneCropType = ["B"];
                const zoneId = starZoneCropType.includes(cropType)
                  ? "*"
                  : item.zoneId;

                fetchPricesheetData(
                  apiseedCompany,
                  cropType,
                  zoneId == "*" ? "NZI" : zoneId,
                  apiseedCompany.technologyId,
                  apiseedCompany.id,
                  apiseedCompany.organizationId,
                  finalZoneId.length,
                  i
                );
              })
            );
            if (i == apiseedCompanys.length - 1) {
              return res.status(200).json({ checking: "Done" });
            }
          }, 9000 * i);
        });
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error });
  }
};

module.exports = { checkPriceCSVSheetData };
