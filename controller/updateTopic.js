const { client } = require("./connection");

const updateTopic = async (req, res) => {
  const allQuery = {
    text: `SELECT * FROM public."TutorialTopics"`,
  };
  await client.query(allQuery, async (err, res2) => {
    if (err) {
      console.log(err.stack);
    } else {
      const unique = [
        ...new Map(
          res2.rows.map((item) => [item["topicOrder"], item])
        ).values(),
      ];

      res.render("updateTopic", {
        topicOrder: res2.rows,
        error: undefined,
      });
    }
  });
};

module.exports = updateTopic;
