import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import mongoose from 'mongoose'
const port = Number(process.env.MONGODB_DEV_PORT || 27018)
const path = resolve('.runtime', `mongo-${port}`)
await mkdir(path, { recursive: true })
const binary = process.env.MONGOD_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe' : 'mongod')
const child = spawn(binary, ['--dbpath', path, '--port', String(port), '--bind_ip', '127.0.0.1', '--replSet', 'smartcrm-dev', '--logpath', resolve('.runtime', `mongo-${port}.log`)], { stdio: 'inherit', windowsHide: true })
child.on('error', error => { console.error(`Cannot start MongoDB: ${error.message}. Set MONGOD_PATH.`); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code || 0 })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill())
const client = new mongoose.mongo.MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 700 })
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    await client.connect()
    try { await client.db('admin').command({ replSetGetStatus: 1 }) }
    catch (error) { if (error.code !== 94) throw error; await client.db('admin').command({ replSetInitiate: { _id: 'smartcrm-dev', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } }) }
    console.log(`Development MongoDB replica set available at 127.0.0.1:${port}. Data directory: ${path}`)
    break
  } catch { await new Promise(resolve => setTimeout(resolve, 500)) }
}
await client.close()
