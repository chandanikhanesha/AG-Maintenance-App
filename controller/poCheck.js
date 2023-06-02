const { client } = require("./connection");
const { sendEmail } = require("../sendEmail");
const checkPo = async (req, res) => {
  const query = {
    text: `SELECT id FROM public."Organizations" order by id ASC`,
  };

  // callback
  client.query(query, async (err, res2) => {
    if (err) {
      console.log(err.stack);
    } else {
      let org = [];

      await Promise.all(
        res2.rows.map((organization) => {
          return client
            .query(
              `SELECT id FROM public."PurchaseOrders" WHERE "organizationId" = ${organization.id} AND "isQuote" = false AND "isDeleted"= false`
            )
            .then(async (res1) => {
              await Promise.all(
                res1.rows.map((purchaseOrder) => {
                  const monsantoIds = [];
                  const missingMonsantoProducts = [];
                  const missingMonsantoProductLineItems = [];
                  let CustomerMonsantoProductCounts = 0;
                  let monsantoProductCounts = 0;
                  let monsantoProductLineItemCounts = 0;
                  return client
                    .query(
                      `SELECT "CustomerMonsantoProducts"."id","CustomerMonsantoProducts"."monsantoProductId" FROM public."CustomerMonsantoProducts" WHERE "CustomerMonsantoProducts"."purchaseOrderId" = ${purchaseOrder.id} AND "CustomerMonsantoProducts"."isDeleted" = false `
                    )
                    .then(async (res) => {
                      await Promise.all(
                        res.rows.map((product) => {
                          if (!monsantoIds.includes(product.id)) {
                            monsantoIds.push(product.id);
                            // CustomerMonsantoProductCounts =
                            //   CustomerMonsantoProductCounts + 1;
                            return client
                              .query(
                                `SELECT "MonsantoProducts"."id" FROM public."MonsantoProducts" WHERE "MonsantoProducts"."id" = ${product.MonsantoProductId}  `
                              )
                              .then((monsantoProducts) => {
                                if (monsantoProducts.rows.length > 0) {
                                  // monsantoProductCounts =
                                  //   monsantoProductCounts + 1;
                                  return client
                                    .query(
                                      `SELECT "MonsantoProductLineItems"."id" FROM public."MonsantoProductLineItems" WHERE "MonsantoProductLineItems"."productId" = ${product.MonsantoProductId}`
                                    )
                                    .then((monsantoProductLineItems) => {
                                      if (
                                        monsantoProductLineItems.rows.length > 0
                                      ) {
                                        // monsantoProductLineItemCounts =
                                        //   monsantoProductLineItemCounts + 1;
                                      } else {
                                        missingMonsantoProductLineItems.push(
                                          monsantoProducts.rows[0].id
                                        );
                                      }
                                    });
                                } else {
                                  missingMonsantoProducts.push(
                                    product.monsantoProductId
                                  );
                                }
                              });
                          }
                        })
                      ).then(() => {
                        org.push({
                          org: organization.id,
                          purchaseOrder: purchaseOrder.id,
                          // CustomerMonsantoProductCounts,
                          // monsantoProductCounts,
                          // monsantoProductLineItemCounts,
                          missingMonsantoProducts,
                          missingMonsantoProductLineItems,
                        });
                      });
                    })
                    .catch((e) => console.error(e.stack));
                })
              );
            })
            .catch((e) => console.error(e.stack));
        })
      );
      // console.log(org, ">>>>>>>>>>>>>>>>>>>>>>>");

      if (org !== "[]" && org.length !== 0) {
        await sendEmail(
          "dev@agridealer.co",
          "Missing MonsantoProduct and MonsantoProductLineItems Report",
          "Missing MonsantoProduct and MonsantoProductLineItems Report",
          `<p>Below Product is not found in MonsantoproductLineItem</p><br></br>${org
            .filter(
              (o) =>
                o.missingMonsantoProductLineItems.length > 0 ||
                o.missingMonsantoProducts.length > 0
            )
            .map((data) => {
              return `<p> =>PurchaseOrderId is ${
                data.purchaseOrder
              } , MissingMonsantoProducts ID is ${
                data.missingMonsantoProducts.length <= 0
                  ? "-"
                  : data.missingMonsantoProducts
              } , MissingMonsantoProductLineItems ID is ${
                data.missingMonsantoProductLineItems <= 0
                  ? "-"
                  : data.missingMonsantoProductLineItems
              } and the organizationId is ${data.org}  </p>`;
            })}`
        );
      }

      res.render("poCheck", {
        data: org.filter(
          (o) =>
            o.missingMonsantoProductLineItems.length > 0 ||
            o.missingMonsantoProducts.length > 0
        ),
      });
    }
  });
};

module.exports = { checkPo };
