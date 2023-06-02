const axios = require("axios");
const { client } = require("./connection");

const bayerOrderCheck = async (req, res) => {
  console.log(req.body, "----");
  const query = {
    text: `SELECT "ApiSeedCompanies".id, "ApiSeedCompanies"."organizationId",o."name"
    FROM public."ApiSeedCompanies"
left outer join "Organizations" o on o.id="ApiSeedCompanies"."organizationId"`,
  };
  let Organization = [];

  try {
    if (req.body.filterType) {
      await axios
        .get(
          `${
            process.env.APIURL
          }/api/monsanto/retailer_orders/bayer_order_check?organizationId=${
            req.body.filterType ? req.body.filterType : "all"
          }`,
          {
            headers: {
              "x-access-token": process.env.TOKEN,
            },
          }
        )
        .then(async (response) => {
          client.query(query, async (err, res2) => {
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
                res.render("bayerOrderCheck", {
                  data: response.data.data,
                  organizationData: Organization,
                  filterType:
                    req.query && req.query.filterType
                      ? req.query.filterType
                      : "all",
                });
              });
            }
          });
        })
        .catch((err) => {
          console.log(`BayerOrdercheck  getting ${err}`, "err");
          res.render("getError", {
            data: [{ error: `BayerOrdercheck  getting ${err}` }],
          });
        });
    } else {
      client.query(query, async (err, res2) => {
        if (err) {
          console.log(err.stack);
        } else {
          await Promise.all(
            res2.rows.map(async (organization) => {
              Organization.push({
                id: organization.id,
                name: organization.name,
              });
            })
          ).then(() => {
            res.render("bayerOrderCheck", {
              data: [],
              organizationData: Organization,
              filterType: "all",
            });
          });
        }
      });
    }
  } catch (err) {
    console.log(`data getting ${err}`, "err");

    res.render("getError", {
      data: [{ error: `BayerOrdercheck  getting ${err}` }],
    });
  }
};

module.exports = { bayerOrderCheck };
