import { MongoClient, type Db, type Collection } from "mongodb"

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient> | null = null

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI
    if (!uri) {
      throw new Error("MONGODB_URI is not set")
    }
    clientPromise = MongoClient.connect(uri, {
      // Add any desired options here
    })
  }
  client = await clientPromise
  return client
}

export async function getMongoDb(): Promise<Db> {
  const dbName = process.env.MONGODB_DB
  if (!dbName) {
    throw new Error("MONGODB_DB is not set")
  }
  const c = await getMongoClient()
  return c.db(dbName)
}

export async function getCollection<T = any>(name: string): Promise<Collection<T>> {
  const db = await getMongoDb()
  return db.collection<T>(name)
}
