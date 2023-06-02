const { client } = require("./connection");

const editsubTopic = async (req, res) => {
  console.log(req.body, "-----from edit changes-------");
  const data = req.body;

  const findQuery = {
    text: `SELECT * FROM public."TutorialTopics" where "topicOrder"=${data.topicOrder} and "subTopicOrder"=${data.subTopicOrder}`,
  };
  await client.query(findQuery, async (err, res2) => {
    if (err) {
      console.log(err.stack, "error at subOrder Find Query");
    } else {
      if (res2.rows.length <= 0) {
        const Query = {
          text: `UPDATE  public."TutorialTopics" 
          SET  "subTopicName"='${data.subTopicName}', "subTopicOrder"='${
            parseInt(data.subTopicOrder) || null
          }', "pageHeader"='${data.pageHeader}', "textContent"='${
            data.textContent
          }', "videoLink"='${data.videoLink}' where id=${req.body.id}`,
        };
        await client.query(Query, async (err, res2) => {
          if (err) {
            console.log(err.stack);
          } else {
          }
        });
      } else {
        const Query = {
          text: `UPDATE  public."TutorialTopics" 
          SET  "subTopicName"='${data.subTopicName}', "pageHeader"='${data.pageHeader}', "textContent"='${data.textContent}', "videoLink"='${data.videoLink}' where id=${req.body.id}`,
        };
        await client.query(Query, async (err, res2) => {
          if (err) {
            console.log(err.stack);
          } else {
          }
        });
        console.log("SubTopicOrder alredy");
      }
    }
  });
};

const editTopic = async (req, res) => {
  const data = req.body;

  console.log(data, "data");
  const Query = {
    text: `UPDATE  public."TutorialTopics" 
    SET  "topicName"='${data.topicName}', "topicOrder"=${
      parseInt(data.topicOrder) || null
    } where "topicOrder"=${parseInt(req.body.id)}`,
  };
  await client.query(Query, async (err, res2) => {
    if (err) {
      console.log(err.stack);
    } else {
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
          console.log(res2.rows.length, "res2.rows");

          res.render("updateAllRecord", {
            error: "Topic Update succesfully",
            topicOrder: unique,
            allTopicData: res2.rows,
          });
        }
      });
    }
  });
};
module.exports = { editTopic, editsubTopic };
