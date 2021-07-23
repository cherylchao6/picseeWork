const express = require("express");
const app = express();
const port = 3005;

app.use(express.urlencoded({ extended: false }));

app.listen(port, ()=>{
  console.log(`The port is listening on ${port}`)
})


const redis = require("redis");
const client = redis.createClient('6379');
function getCache (key) { 
  return new Promise((resolve, reject) => {
      client.get(key, (err, data) => {
          if (err) reject(err);
          resolve(data);
      });
  });
}


app.get("/", async (req,res) => {
  let {user} = req.query;
  //沒有user的情況下以IP登入
  if (!user) {
    let clientip = req.connection.remoteAddress;
    let value = await getCache(clientip);
    //10分鐘內第一次登入
    if (value === null) {
      let data = {
        count: 1,
        time: new Date().getTime()
      };
      client.setex(clientip, 600, JSON.stringify(data));
      let message = {
        message: `目前造訪1次`
      }
      res.status(200).send(message)
      return
    }
    //10分鐘內非第一次登入
    let parsedValue = JSON.parse(value);
    //如果api次數比五大，跟使用者說還要多久才能進來
    if (parsedValue.count >= 5) {
      let time = JSON.parse(value)['time']
      let expiredTime = time + 600000;
      var clock = new Date(expiredTime);
      let message = {
          message: `請於${clock}再造訪`
      }
      res.status(429).send(message);
      return;
    } else {
      //如果api次數比五小，要更新打api次數
      parsedValue.count += 1;
      client.set(clientip,JSON.stringify(parsedValue));
      let message = {
        message: `目前造訪${parsedValue.count}次`
      };
      res.status(200).send(message);
      return;
    }
  } 
  if (user !== 'admin') {
    let limitation = req.limitation
    let value = await getCache(user);
    if (value === null) {
      let data = {
        count: 1,
        time: new Date().getTime()
      };
      client.setex(user, 600, JSON.stringify(data));
      let message = {
        message: `目前造訪1次`
      }
      res.status(200).send(message)
      return
    }
    let parsedValue = JSON.parse(value);
    if (parsedValue.count >= 5) {
      let time = JSON.parse(value)['time']
      let expiredTime = time + 600000;
      var clock = new Date(expiredTime);
      let message = {
          message: `請於${clock}再造訪`
      }
      res.status(429).send(message)
    } else {
      parsedValue.count += 1;
      client.set(user,JSON.stringify(parsedValue));
      let message = {
        message: `目前造訪${parsedValue.count}次`
      }
      res.status(200).send(message)
    }
  } else {
    //admin 就都沒有限制
    return res.sendStatus(200)
  }
})

