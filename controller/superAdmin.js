const axios = require("axios");
const { client } = require("./connection");

const superAdmin = async (req, res) => {
  await axios
    .get(`${process.env.APIURL}/api/organizations/superAdminData`, {
      headers: {
        "x-access-token": process.env.TOKEN,
      },
    })
    .then(async (response) => {
      console.log(response.data.data.length);

      return res.render("superAdmin", {
        data: response.data.data,
      });
    })
    .catch((e) => {
      console.log(e, "");
    });
};
module.exports = superAdmin;
