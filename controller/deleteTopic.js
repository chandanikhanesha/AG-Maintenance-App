const { client } = require("./connection");

const deleteTopic = async (req, res) => {
  console.log(req.body);
  const Query = {
    text: `DELETE  FROM public."TutorialTopics" where "topicOrder"=${req.body.id}`,
  };
  await client.query(Query, async (err, res2) => {
    if (err) {
      console.log(err.stack);
    } else {
    }
  });
};
const deleteSubTopic = async (req, res) => {
  console.log(req.body);
  const Query = {
    text: `DELETE  FROM public."TutorialTopics" where id=${req.body.id}`,
  };
  await client.query(Query, async (err, res2) => {
    if (err) {
      console.log(err.stack);
    } else {
    }
  });
};
module.exports = { deleteTopic, deleteSubTopic };
