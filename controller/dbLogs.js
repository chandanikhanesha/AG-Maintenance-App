const { client2 } = require("./connection");

//get all the db logs from agridealer app
const dbLogs = async (req, res) => {
  console.log(req.query);

  try {
    let org = [];
    let query = `SELECT * FROM public."dblogs"`;

    if (!req.query) {
      query = `SELECT * FROM public."dblogs"`;
    } else if (req.query && req.query.filterValue && req.query.filterType) {
      if (req.query.filterType === "showAll") {
        query = `SELECT * FROM public."dblogs"`;
      } else {
        const filterValue = req.query.filterValue;
        const filterType = req.query.filterType;

        if (filterType === "queriestype") {
          query = `SELECT * FROM public."dblogs"  WHERE "queriestype" ILIKE UPPER('${filterValue}%')`;
        } else if (filterType === "id") {
          query = `SELECT * FROM public."dblogs"  WHERE "${filterType}" = '${filterValue}' `;
        } else {
          query = `SELECT * FROM public."dblogs"  WHERE "${filterType}" ILIKE '${filterValue}%' `;
        }
      }
    } else if ((req.query && req.query.startDate) || req.query.endDate) {
      if (req.query.startDate !== "" && req.query.endDate !== "") {
        query = `SELECT * FROM public."dblogs"  WHERE "createdat" >= '${req.query.startDate}'
        AND "createdat" <  '${req.query.endDate}'`;
      } else {
        query = `SELECT * FROM public."dblogs"  WHERE "createdat" = '${
          req.query.startDate ? req.query.startDate : req.query.endDate
        }'`;
      }
    }

    await client2
      .query(query)
      .then(async (res1) => {
        return res1.rows.map((data) => {
          org.push({
            id: data.id,
            tableName: data.tablename,
            dblogs: data.querieslogs,
            queriestype: data.queriestype,
            createdAt: new Date(data.createdat).toLocaleDateString("en-US"),
          });
        });
      })
      .catch((e) => console.error(e.stack)),
      res.render("dbLogs", {
        filterValue: req.query
          ? req.query.filterType === "showAll"
            ? ""
            : req.query.filterValue
          : "",
        filterType:
          req.query && req.query.filterType === "showAll"
            ? "showAll"
            : req.query.filterType !== undefined && !req.query.startDate
            ? req.query.filterType
            : "createdat",
        data: org,
        startDate: req.query && req.query.startDate ? req.query.startDate : "",
        endDate: req.query && req.query.endDate ? req.query.endDate : "",
      });
  } catch (e) {
    console.log(e);
  }
};

module.exports = { dbLogs };
