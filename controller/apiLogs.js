const { client2 } = require("./connection");

// get all the api logs from agri dealer app and show in the Ui with filteration
const apiLogs = async (req, res) => {
  try {
    let org = [];
    let query = `SELECT * FROM public."apilogs"`;
    if (!req.query) {
      query = `SELECT * FROM public."apilogs"`;
    } else if (req.query && req.query.filterValue && req.query.filterType) {
      if (req.query.filterType === "showAll") {
        query = `SELECT * FROM public."apilogs"`;
      } else {
        const filterValue = req.query.filterValue;
        const filterType = req.query.filterType;

        if (filterType === "requesttype") {
          query = `SELECT * FROM public."apilogs"  WHERE "requesttype" ILIKE UPPER('${filterValue}%')`;
        } else {
          query = `SELECT * FROM public."apilogs"  where "${filterType}" = '${filterValue}' `;
        }
      }
    } else if ((req.query && req.query.startDate) || req.query.endDate) {
      if (req.query.startDate !== "" && req.query.endDate !== "") {
        query = `SELECT * FROM public."apilogs"  WHERE "createdat" >= '${req.query.startDate}'
        AND "createdat" <  '${req.query.endDate}'`;
      } else {
        query = `SELECT * FROM public."apilogs"  WHERE "createdat" = '${
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
            org: data.organizationid || "-",
            userId: data.userid,
            type: data.apitype,
            description: data.description,
            createdAt: new Date(data.createdat).toLocaleDateString("en-US"),
            apistatus: data.apistatus,
            payload: data.payload,
            responsetime: data.responsetime,
            requesttype: data.requesttype,
          });
        });
      })
      .catch((e) => console.error(e.stack)),
      res.render("apiLogs", {
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

module.exports = { apiLogs };
