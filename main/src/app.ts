import * as express from 'express'
import * as cors from 'cors'
import { createConnection, FindOptionsWhere } from 'typeorm'
import { Request, Response } from 'express'
import { Product } from './entity/product'
import * as amqp from 'amqplib/callback_api'
import axios from 'axios'

createConnection().then(db => {
    const productRepository = db.getRepository(Product)

    amqp.connect('amqps://iuuopuiw:D6HFuOyvPZCTdTOcuNUvfQe22wUgwLfs@rat.rmq2.cloudamqp.com/iuuopuiw', (error0, connection) => {
        if (error0) {
            throw error0
        }

        connection.createChannel((error1, channel) => {
            if (error1) {
                throw error1
            }

            channel.assertQueue('product_created', { durable: false })
            channel.assertQueue('product_updated', { durable: false })
            channel.assertQueue('product_deleted', { durable: false })

            const app = express()

            app.use(cors({
                origin: ['http://localhost:3000']
            }))

            app.use(express.json())

            channel.consume('product_created', async (msg) => {
                const eventProduct: Product = JSON.parse(msg.content.toString())
                const product = new Product()
                product.admin_id = eventProduct.id
                product.title = eventProduct.title
                product.image = eventProduct.image
                product.like = eventProduct.like
                await productRepository.save(product)
                console.log('Product created')
            }, { noAck: true })

            channel.consume('product_updated', async (msg) => {
                const eventProduct: Product = JSON.parse(msg.content.toString())
                const product = await productRepository.findOneBy({ admin_id: eventProduct.id } as FindOptionsWhere<Product>)
                productRepository.merge(product, {
                    title: eventProduct.title,
                    image: eventProduct.image,
                    like: eventProduct.like
                })
                await productRepository.save(product)
                console.log('Product updated')
            }, { noAck: true })

            channel.consume('product_deleted', async (msg) => {
                const admin_id = JSON.parse(msg.content.toString()).id
                await productRepository.delete({ admin_id: admin_id } as FindOptionsWhere<Product>)
                console.log('Product deleted')
            }, { noAck: true })

            app.get('/api/products', async (req: Request, res: Response) => {
                const products = await productRepository.find()
                return res.send(products)
            })

            app.post('/api/products/:id/like', async (req: Request, res: Response) => {
                const product = await productRepository.findOneBy({ id: req.params.id } as FindOptionsWhere<Product>)
                await axios.post(`http://localhost:8001/api/products/${product.admin_id}/like`, {})
                product.like ++
                await productRepository.save(product)
                return res.send(product)
            })

            console.log("Listening on port 8002")
            app.listen(8002)
            process.on('beforeExit', () => {
                console.log('closing')
                connection.close()
            })

        })
    })
})
