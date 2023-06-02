const { client } = require("./controller/connection");

async function parsePurchaseOrder(page, URL, custId, poID, isQuote) {
  await page.goto(
    `${URL}/app/customers/${custId}/${
      isQuote ? "quote" : "purchase_order"
    }/${poID}`,
    {
      waitUntil: ["domcontentloaded", "networkidle0"],
    }
  );
  const totalObj = await page.evaluate(() => {
    const grandTotal = document.querySelector(
      "[data-test-id=gradTotal]"
    )?.textContent;
    const pretotal = document.querySelector(
      "[data-test-id=pretotal]"
    )?.textContent;
    const discount = document.querySelector(
      "[data-test-id=discount]"
    )?.textContent;
    return { grandTotal, pretotal, discount };
  });

  await page.goto(`${URL}/app/customers/${custId}/preview/${poID}`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  const balanceDue = await page.evaluate(() => {
    const balanceDue = document.querySelector(
      "[data-test-id=balanceDue]"
    )?.textContent;
    return balanceDue;
  });
  return { totalObj, balanceDue };
}

// const verifyToken = async (req, res, next) => {
//   const query = {
//     text: `SELECT email
//     FROM public."Users" where email='${process.env.EMAIL}'`,
//   };

//   await client.query(query, async (err, res2) => {
//     let isAuth = false;
//     if (err) {
//       console.log(err.stack);
//     } else {
//       await Promise.all(
//         res2.rows.map(async (data) => {
//           console.log("data", data);
//           if (data) {
//             isAuth = true;
//           }
//         })
//       ).then(() => {
//         return isAuth;
//       });
//     }
//   });
// };

module.exports = { parsePurchaseOrder };
