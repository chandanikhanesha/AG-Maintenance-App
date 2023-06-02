const { client } = require("./connection");

const updateAllTurorial = async (req, res) => {
  const allQuery = {
    text: `SELECT * FROM public."TutorialTopics"`,
  };
  await client.query(allQuery, async (err, res2) => {
    if (err) {
      console.log(err.stack);
    } else {
      allData = res2.rows;
      res.render("updateAllRecord", {
        allTopicData: allData,
        error: undefined,
      });
    }
  });
};

module.exports = updateAllTurorial;
