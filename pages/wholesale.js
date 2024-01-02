import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import styles from '../styles/wholesale.module.css'
import EmailGB from '../components/mailer'
import OrderSummary from '../lib/order-summary';
import Image from 'next/image';

function ProductRow({product, addToCart }) {
  const [invalidQuant, setInvalidQuant] = useState(false);
  const [quantityDesired, setQuantityDesired] = useState('');
  const parsedQuantityDesired = parseInt(quantityDesired)

  const [quantity, setQuantity] = useState(product.quantity);
  const parsedQuantityAvail = parseInt(quantity)
  
  let perUnit = product.unit;
  if (perUnit.endsWith('es')) {
    perUnit = perUnit.slice(0, -2);
  } else if (perUnit.endsWith('s')) {
    perUnit = perUnit.slice(0, -1);
  }

  return(
  <tr >
    <td>{product.name}</td>
    {quantity === 1? <td>{quantity} {perUnit}</td> : <td>{quantity} {product.unit}</td>}
    <td>{'$'+product.price+'/'+perUnit}</td>
    {invalidQuant ? (<td>Sorry, only {quantity} {product.unit} available</td>) : (<td></td>)}
    <td>
    <form>
      <div style={{display: 'flex'}}>
          <input type="integer"
          onSelect={e => setInvalidQuant(false)}
          value= {quantityDesired}
          placeholder="0"
          onChange={e=> setQuantityDesired(e.target.value)}
          style = {{ width: '40px' }} />
        <button
          onClick={e => {
            e.preventDefault();
            console.log(quantityDesired, quantity)
            if (isNaN(parsedQuantityDesired) || parsedQuantityDesired < 0 || parsedQuantityAvail  < parsedQuantityDesired) {
              setInvalidQuant(true);
            return;
          }
          console.log(quantityDesired)
          addToCart({product, quantityDesired});
          setQuantityDesired('');
          setQuantity(product.quantity-quantityDesired)
        }}>Add</button>
      </div>
    </form>
    </td>
  </tr>
  )
}

function CartRow({ product, removeFromCart }) {
  const total_price = (product.cart * product.price).toFixed(2)
  return(
  <tr>
    <td>{product.name}</td>
    <td>{product.cart +' ' + product.unit}</td>
    <td>{'$'+product.price}</td>
    <td>{'$'+total_price}</td>
    <td><button onClick={() => removeFromCart({product})}>Remove</button></td>
    {/* this part was kind of confusing to me because your passing a prop
    to handleClick, which is a prop itself
    like handle click isn't ever a function, but you can still pass it a prop
    as if it was a function?*/}
  </tr>
  )}

function ListTable({products, addToCart }) {
  const rows = products.map((product) => (
  <ProductRow key={product.id} product={product} addToCart={addToCart} />
  ));
  return (
    <table>
      <thead style = {{ textAlign: 'left'}}>
        <tr>
          <th>Name</th>
          <th>Quantity Available</th>
          <th>Price</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

function CartTable({ products, removeFromCart, onSubmit, custname, email, notes, setCustname, setEmail, setNotes }) {

  const rows = products
  .filter((product) => product.cart > 0)
  .map((product) => (
  <CartRow key={product.id} product={product} removeFromCart={removeFromCart}/>
  ));
  return (
    <div>
            <hr></hr>
    <table>
      <thead>
        <tr>
        <th colSpan="5">
            CART
          </th>
        </tr>
        <tr>
          <th>Name</th>
          <th>Quantity Selected</th>
          <th>Price</th>
          <th>Total Price</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
      </table>
      <hr></hr>
      <p>Checkout total: ${products.reduce((total, product) => total + (product.cart * product.price), 0).toFixed(2)}</p>
      <form>
        <input type="text"
        value = {custname}
        onChange={e => setCustname(e.target.value)}
        required
        placeholder="Name / Organization"/>
        <input type="text"
        value = {email}
        onChange={e => setEmail(e.target.value)}
        required
        placeholder="Email"/>
        <input type="textarea"
        value = {notes}
        placeholder="Notes"
        onChange={e=> setNotes(e.target.value)}/>
      <button
        onClick={e => {onSubmit(e);}
        }>Submit Order</button>
      </form>
    </div>
  );
}





export default function App() {
  const [custname, setCustname] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    fetch('/api/data')
      .then(response => response.json())
      .then(data => {
        setProducts(data);

      })
      .catch(error => console.error('Error:', error));
  }, []);

  let order = {
    name: custname,
    email: email,
    notes: notes,
    products: products.filter((product) => product.cart > 0)
  }

  let productsToUpdate = products.filter((product) => product.cart > 0)

  function submitOrder(e) {
    e.preventDefault();
    console.log('submitting order', {order});
    setIsLoading(true);
    fetch('/api/update-table', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'},
      body: JSON.stringify(productsToUpdate)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(response => {console.log('products updated', response)})
    fetch('/api/place-order', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'},
      body: JSON.stringify(order)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      // .then(response => {
      //   return EmailGB({order});
      // })
      .then(response => {
        console.log('this should come after email sent ok')
        setIsLoading(false);
        setOrderPlaced(true)})
      .catch(error => console.error('Error:', error));
  }

  function addToCart({product, quantityDesired, setQuantityDesired, unitSelected, quantity, setQuantity, setInvalidQuant, qAvailable, productMultiplier}){
    // q available is the quantity available in the unit selected

    // everything is in the base unit
    // if unitSeelcted, then we just display it in the unit selected
    // all the numbers passed around are in the base unit
    // nothing is rounded until it is displayed

    // quantity desired comes in with whatever unit is selected
    // so that needs to change to the base unit
    unitSelected ? (productMultiplier = (product.price[0] / product.price[1]).toFixed(2)) : (productMultiplier = 1)

    const baseUnitQuantityDesired = unitSelected ? parseFloat(quantityDesired/productMultiplier) : parseFloat(quantityDesired)
    const parsedQuantityAvail = parseFloat(quantity) // in base unit
  
    const newQuantity = parseFloat(parsedQuantityAvail - baseUnitQuantityDesired)
  

    const productToAdd = {...product, cart: baseUnitQuantityDesired, unitSelected: unitSelected, quantity: newQuantity}

    if (isNaN(baseUnitQuantityDesired) || baseUnitQuantityDesired < 0 || parseFloat(qAvailable)  < (baseUnitQuantityDesired*productMultiplier)) {
      setInvalidQuant(true);
      return;
    } else {
    const nextProducts = products.map((p) => {
      if (p.id === product.id) {
        var newQuantity = parseInt(p.quantity)-parseInt(quantityDesired)
        var newCart = parseInt(p.cart)+parseInt(quantityDesired)
        return {...p, quantity: newQuantity, cart: newCart};
      } else {
        return p;
      }
    });
    setProducts(nextProducts);
    setQuantityDesired('');
  }}


  function removeFromCart({product}) {
    const nextProducts = products.map((p) => {
      if (p.id === product.id) {
        return { ...p, quantity: parseInt(p.quantity) + parseInt(p.cart), cart: parseInt(p.cart) - parseInt(p.cart)};
      } else{
        return p;
      }
    });
    setProducts(nextProducts)
  }

  const CartLen = products.filter((product) => product.cart > 0).length


  return <>
  <Layout>
    <h1 className={styles.centerText}>Wholesale Ordering Form</h1> 
    {isLoading &&  <Image className={styles.loading}
                    priority
                    src="/images/cabbagelogotransparent.png"
                    height={2500}
                    width={2323}
                    alt="cabagelogotransparent"
                />}
      {orderPlaced ? ( <p></p>
      ) : (
        <ListTable className={styles.centerText} products={products} addToCart={addToCart} />
      )}
        <div>
      {orderPlaced ? (
        <OrderSummary order = {order} />
      ) : CartLen === 0 ? (<h1 className={styles.centerText}>Cart is empty</h1>
      ) : (
      <CartTable className={styles.centerText} products={products} removeFromCart={removeFromCart} onSubmit={submitOrder} custname={custname} 
      email={email} 
      notes={notes} 
      setCustname={setCustname} 
      setEmail={setEmail} 
      setNotes={setNotes} 
      />
    )}
    </div>
  </Layout>
  </>
}

