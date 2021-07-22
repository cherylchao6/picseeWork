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
  if (!user) {
    console.log('26')
    let data = {
      count: 1,
      time: new Date().getTime()
    };
    let clientip = req.connection.remoteAddress;
    client.setex(clientip, 600, JSON.stringify(data));
    res.sendStatus(401);
    return 
  } 
  if (user !== 'admin') {
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
    console.log('72')
    return res.sendStatus(200)
  }
})