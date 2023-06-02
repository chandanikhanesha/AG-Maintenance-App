const USERNAME = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const { client } = require("./connection");

const Login = async (req, res) => {
  console.log(req.body, USERNAME, PASSWORD);
  let Organization = [];
  if (USERNAME === req.body.email && PASSWORD === req.body.password) {
    const query = {
      text: `SELECT "ApiSeedCompanies".id, "ApiSeedCompanies"."organizationId",o."name"
      FROM public."ApiSeedCompanies"
left outer join "Organizations" o on o.id="ApiSeedCompanies"."organizationId"`,
    };

    res.cookie("isLogging", req.body.email);
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
    res.render("errorMessage");
    console.log("User not found");
  }
};

module.exports = Login;
