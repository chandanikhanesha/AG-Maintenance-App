const { client } = require("./connection");
const axios = require("axios");

//get all the db logs from agridealer app
const listZones = async (req, res) => {
  try {
    let listZone = [];
    let finalZoneData = [];
    let query = `
    SELECT ap.id ,ap."organizationId",og.name,ap."zoneIds" as apiZoneIds,cust."zoneIds" as custZoneIds, u."firstName", u."lastName",ap."password",ap."technologyId",ap."username"
    FROM "ApiSeedCompanies" ap
        left outer join "Users" u on u."organizationId" = ap."organizationId"
        left outer join "Organizations" og on og.id = ap."organizationId"
        left outer join "Customers" cust on cust."organizationId" = ap."organizationId" and cust.name='Bayer Dealer Bucket' `;

    await client
      .query(query)
      .then(async (res1) => {
        res1.rows
          .filter((resData) => resData.organizationId !== null)
          .map((resData) => {
            listZone.push({
              isGlnId: true,
              name: `${resData.firstName} ${resData.lastName}`,
              password: resData.password,
              technologyId: resData.glnId || resData.technologyId,
              username: resData.username,
              customerZoneId: resData.custzoneids,
              apiZoneIds: resData.apizoneids,
              organizationId: resData.organizationId,
              orgName: resData.name,
            });
          });
      })
      .catch((e) => console.error(e.stack));

    const arrayUniqueByKey = [
      ...new Map(
        listZone.map((item) => [item["organizationId"], item])
      ).values(),
    ];
    console.log(arrayUniqueByKey.length, "arrayUniqueByKey");
    const myPromise = new Promise((resolve, reject) => {
      arrayUniqueByKey.length > 0 &&
        arrayUniqueByKey.map((data, i) => {
          setTimeout(async () => {
            console.log(2000 * i, i);
            await axios
              .post(
                `${process.env.APIURL}/api/monsanto/grower_licence/check`,
                data,
                {
                  headers: {
                    "x-access-token": process.env.TOKEN,
                  },
                }
              )
              .then((r) => {
                const responseData = r.data.licences[0].statusDetails;

                finalZoneData.push({
                  customerZoneIds:
                    data.customerZoneId !== null &&
                    JSON.parse(data.customerZoneId).filter(
                      (c) =>
                        c["classification"] == "CORN" ||
                        c["classification"] == "COTTON"
                    ),
                  apiZoneIds:
                    data.apiZoneIds !== null &&
                    JSON.parse(data.apiZoneIds).filter(
                      (c) =>
                        c["classification"] == "C" || c["classification"] == "T"
                    ),

                  organizationId: data.organizationId,
                  orgName: data.orgName,
                  username: data.name,

                  bayerZoneId: responseData.filter(
                    (d) =>
                      d.classification == "COTTON" || d.classification == "CORN"
                  ),
                });
              })
              .catch((e) => {
                let error = "-";

                console.log(e.response && e.response.status, "Api status code");
                if (e.response && e.response.status == 500) {
                  console.log(e.response.data.error["con:reason"]);
                  error = e.response.data.error["con:reason"];
                }

                finalZoneData.push({
                  customerZoneIds:
                    data.customerZoneId !== null &&
                    JSON.parse(data.customerZoneId).filter(
                      (c) =>
                        c["classification"] == "CORN" ||
                        c["classification"] == "COTTON"
                    ),
                  apiZoneIds:
                    data.apiZoneIds !== null &&
                    JSON.parse(data.apiZoneIds).filter(
                      (c) =>
                        c["classification"] == "C" || c["classification"] == "T"
                    ),

                  organizationId: data.organizationId,
                  orgName: data.orgName,
                  username: data.name,

                  bayerZoneId: error,
                });
              });

            console.log(finalZoneData.length, "--------------");
            if (arrayUniqueByKey.length == finalZoneData.length) {
              resolve(finalZoneData);
            }
          }, 2000 * i);
        });
    });

    await Promise.all([myPromise]).then((d) => {
      console.log(finalZoneData.length, "finalZoneData");
      res.render("listzone", {
        data: finalZoneData,
      });
    });
  } catch (e) {
    console.log(e);
  }
};

module.exports = { listZones };
