const { client } = require("./connection");
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
var fs = require("fs");

const s3 = new aws.S3({
  endpoint: process.env.BUCKET_ENDPOINT,

  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
});
const bucket = process.env.BUCKET;

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucket,
    acl: "public-read",
    key: function (request, file, cb) {
      const data = request.body;
      const order = data.topicOrder.split("-")[0];
      console.log(file, "file");
      cb(
        null,
        `SubTopicImages/${order}/SubTopicOrder/${data.subTopicOrder}/${file.originalname}`
      );
    },
  }),
}).array("images", 20);
const createTopic = async (req, res) => {
  const data = req.body;

  const findQuery = {
    text: `SELECT * FROM public."TutorialTopics" where "topicOrder"=${data.topicOrder}`,
  };
  await client.query(findQuery, async (err, res2) => {
    if (err) {
      console.log(err.stack, "from topic order");
    } else {
      console.log(res2.rows.length, "res2");

      if (res2.rows.length <= 0) {
        const query = {
          text: `INSERT INTO public."TutorialTopics"(
      "topicName", "topicOrder",  "createdAt", "updatedAt")
      VALUES ('${data.topicName}', '${
            data.topicOrder
          }', '${new Date().toDateString()}','${new Date().toDateString()}')`,
        };
        await client.query(query, async (err, res2) => {
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

                return res.render("topicForm", {
                  error: "Topic has been created",
                  topicOrder: unique,
                  allTopicData: res2.rows,
                });
              }
            });
          }
        });
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

            return res.render("topicForm", {
              error: "TopicOrder has been alredy exits",
              topicOrder: unique,
              allTopicData: res2.rows,
            });
          }
        });
      }
    }
  });
};

const getTopic = async (req, res) => {
  console.log(req.body, "req");
  const allQuery = {
    text: `SELECT * FROM public."TutorialTopics"`,
  };
  await client.query(allQuery, async (err, res2) => {
    if (err) {
      console.log(err.stack);
    } else {
      res.json(res2.rows);
    }
  });
};

const createSubTopic = async (req, res) => {
  upload(req, res, async (error) => {
    if (error) {
      console.log(error);
    } else {
      const data = req.body;
      const order = data.topicOrder.split("-")[0];
      const orderName = data.topicOrder.split("-")[1];

      const findQuery = {
        text: `SELECT * FROM public."TutorialTopics" where "topicOrder"=${order} and "subTopicOrder"='${data.subTopicOrder}'`,
      };
      await client.query(findQuery, async (err, res2) => {
        if (err) {
          console.log(err.stack, "error at subOrder Find Query");
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
              allTopics = unique;

              allData = res2.rows;
            }
          });

          if (res2.rows.length <= 0) {
            const images = [];
            req.files.map((f) => {
              images.push(f.location);
            });

            const query = {
              text: `INSERT INTO public."TutorialTopics"(
          "topicName", "topicOrder", "subTopicName", "subTopicOrder", "pageHeader", "textContent","videoLink","images","createdAt", "updatedAt")
          VALUES ('${orderName}', '${order}', '${data.subTopicName}', '${
                data.subTopicOrder
              }','${data.pageHeader}','${data.textContent}','${
                data.videoLink
              }','${JSON.stringify(
                images
              )}','${new Date().toDateString()}','${new Date().toDateString()}')`,
            };
            client.query(query, async (err, res2) => {
              if (err) {
                console.log(err.stack, "topic sub Order");
              } else {
                console.log("create order and image save done");
                return res.render("topicForm", {
                  error: "SubTopic has been created",
                  topicOrder: allTopics,
                  allTopicData: allData,
                });
              }
            });
          } else {
            return res.render("topicForm", {
              error: "SubTopicOrder has been alredy exits",
              topicOrder: allTopics,
              allTopicData: allData,
            });
          }
        }
      });
    }
  });
};

module.exports = { createTopic, getTopic, createSubTopic };
