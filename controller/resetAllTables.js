const { client } = require("./connection");
const ResetAllTable = async (req, res) => {
  try {
    const oId = req.body.oId;
    let technologyId = 0;

    await (req.body.oId != "all" &&
      client.query(
        `SELECT * FROM public."ApiSeedCompanies" WHERE "organizationId" = ${oId}`,
        (err, resRow) => {
          if (err) {
            console.log("Delete query error", err);

            return res.status(422).json({ error: err.stack });
          }
          if (resRow) {
            console.log(resRow.rows[0]);
            if (resRow.rows[0] === undefined) {
              return res
                .status(422)
                .json({ error: "API seed compines not found" });
            }
            technologyId = resRow.rows[0].technologyId;
          }
        }
      ));
    console.log(req.body.oId, " req.body.oId----------");
    await client
      .query(
        req.body.oId == "all"
          ? `SELECT * FROM public."MonsantoProducts" WHERE "isFavorite" = true`
          : `SELECT * FROM public."MonsantoProducts" WHERE "isFavorite" = true and "organizationId"=${oId}`
      )
      .then(async (monsantoProducts) => {
        await monsantoProducts.rows.map((d, i) => {
          setTimeout(() => {
            const query = {
              text: `INSERT INTO public."TempTableMonsantoFavProducts"(classification, packaging, "seedSize", brand, blend, treatment, "productDetail", quantity, "crossReferenceId", "syncQuantityDate", "organizationId", "seedCompanyId", "isFavorite", "createdAt", "updatedAt", "isDeletedInBayer")
            VALUES('${d.classification}','${d.packaging}', '${d.seedSize}','${
                d.brand
              }','${d.blend}','${d.treatment}','${d.productDetail}',${
                d.quantity
              },'${d.crossReferenceId}','${new Date().toDateString(
                d.syncQuantityDate
              )}',${d.organizationId},${d.seedCompanyId},${
                d.isFavorite
              },'${new Date().toDateString()}','${new Date().toDateString()}',${
                d.isDeletedInBayer
              })`,
            };

            client.query(query, (err, res) => {
              if (err) {
                console.log("query error", err);
              } else {
                console.log("create Succesfully");
              }
            });
          }, 10 * i);
        });
      });

    setTimeout(() => {
      client
        .query(
          req.body.oId == "all"
            ? `TRUNCATE "DeliveryReceiptDetails","DeliveryReceipts","CustomLots","Lots","MonsantoLots","CustomerCustomProducts",
            "CustomerMonsantoProducts","CustomerProducts","MonsantoFavoriteProducts",
            "Farms","Reports","Statements","StatementSettings","Payments","ProductPackagings","Notes","PurchaseOrders",
            "MonsantoProductBookingSummaryProducts","MonsantoRetailerOrderSummaryProducts","MonsantoOrderResponseLogs","ActionLogs","MonsantoReqLogs"
             RESTART IDENTITY CASCADE`
            : `DELETE FROM public."DeliveryReceiptDetails" dd
      USING public."DeliveryReceipts" d
      WHERE  d."organizationId"=${oId} and d.id = dd."deliveryReceiptId";
      DELETE FROM public."DeliveryReceipts" where "organizationId"=${oId};
      DELETE FROM public."CustomLots"  where "organizationId"=${oId};
      DELETE FROM public."Lots" where "organizationId"=${oId};
      DELETE FROM public."MonsantoLots" where "organizationId"=${oId};
      DELETE FROM public."CustomerCustomProducts" where "organizationId"=${oId};
      DELETE FROM public."CustomerMonsantoProducts" where "organizationId"=${oId};
      DELETE FROM public."CustomerProducts"  where "organizationId"=${oId};
      DELETE FROM public."Farms" f
      USING public."Customers" c
      WHERE  c."organizationId"=${oId} and c.id = f."customerId";
      DELETE FROM public."Reports" where "organizationId"=${oId};
      DELETE FROM public."Statements" where "organizationId"=${oId};
      DELETE FROM public."StatementSettings" where "organizationId"=${oId};
      DELETE FROM public."Payments" pt
      USING public."PurchaseOrders" po
      WHERE po."organizationId"=${oId} and po.id = pt."purchaseOrderId";
      DELETE FROM public."ProductPackagings" where "organizationId"=${oId};
      DELETE FROM public."Notes" where "organizationId"=${oId};
      DELETE FROM public."PurchaseOrders" where "organizationId"=${oId};

      DELETE FROM public."MonsantoProductBookingLineItems" mpl
      USING public."MonsantoProductBookingSummaryProducts" mps
      WHERE mps."organizationId"=${oId} and mps.id = mpl."productId";

      DELETE FROM public."MonsantoProductBookingSummaryProducts" mps
      USING public."MonsantoProducts" mp
      WHERE mp."organizationId"=${oId} and mp.id = mps."productId";

     DELETE FROM public."MonsantoRetailerOrderSummaryProducts" mrs
      USING public."MonsantoRetailerOrderSummaries" mr
      WHERE mr."buyerMonsantoId"='${technologyId}' and mr.id = mrs."productId";

      DELETE FROM public."MonsantoPriceSheets" mrs
      USING public."ApiSeedCompanies" ac
      WHERE ac."organizationId"=${oId} and ac."technologyId" = mrs."buyerMonsantoId";
      DELETE FROM public."MonsantoOrderResponseLogs" where "organizationId"=${oId};
      DELETE FROM public."ActionLogs" where "organizationId"=${oId};
      DELETE FROM public."MonsantoReqLogs" where "organizationId"=${oId}`
        )
        .then(() => {
          client.query(
            `DELETE FROM  public."MonsantoProductLineItems" WHERE
              "MonsantoProductLineItems"."crossReferenceProductId" NOT LIKE 'specialID and "MonsantoProductLineItems"."organizationId" = ${oId}'`
          );
        })
        .then(() => {
          client.query(`DELETE FROM  public."MonsantoProducts" WHERE
            "MonsantoProducts"."productDetail" NOT LIKE 'specialID' and  "MonsantoProducts"."classification" NOT LIKE 'no' and "MonsantoProducts"."organizationId" =${oId}`);
          console.log("Delete Succesfully");
          return res
            .status(200)
            .json({ message: "Delete  table record successfully" });
        })
        .catch((err) => {
          console.log("Delete query error", err.stack);

          return res.status(422).json({ error: err.stack });
        });
    }, 6000);
  } catch (e) {
    console.log("Error while reset all tables", e);
    return res.status(500).json({ error: e });
  }
};

module.exports = ResetAllTable;

// `TRUNCATE "DeliveryReceiptDetails","DeliveryReceipts","CustomLots","Lots","MonsantoLots","CustomerCustomProducts",
// "CustomerMonsantoProducts","CustomerProducts","MonsantoFavoriteProducts",
// "Farms","Reports","Statements","StatementSettings","Payments","ProductPackagings","Notes","PurchaseOrders",
// "MonsantoProductBookingSummaryProducts","MonsantoRetailerOrderSummaryProducts","MonsantoOrderResponseLogs","ActionLogs","MonsantoReqLogs"
//  RESTART IDENTITY CASCADE`

// DELETE FROM public."MonsantoRetailerOrderSummaries" mrs
// USING public."ApiSeedCompanies" ac
// WHERE ac."technologyId"='${technologyId}' and ac."technologyId" = mrs."buyerMonsantoId";
