const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// SIMPLE IN-MEMORY DATABASE (No MongoDB needed)
let books = [
  {
    id: 1,
    isbn: "9780061120084",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    published_year: 1960,
    price: 12.99,
    reviews: []
  },
  {
    id: 2,
    isbn: "9780743273565",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    published_year: 1925,
    price: 10.99,
    reviews: []
  },
  {
    id: 3,
    isbn: "9780141439600",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    published_year: 1813,
    price: 9.99,
    reviews: []
  },
  {
    id: 4,
    isbn: "9780439139601",
    title: "Harry Potter and the Philosopher's Stone",
    author: "J.K. Rowling",
    published_year: 1997,
    price: 15.99,
    reviews: []
  },
  {
    id: 5,
    isbn: "9780544003415",
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    published_year: 1937,
    price: 14.99,
    reviews: []
  },
  {
    id: 6,
    isbn: "9781982127794",
    title: "The Silent Patient",
    author: "Alex Michaelides",
    published_year: 2019,
    price: 16.99,
    reviews: []
  }
];

let users = [];
let tokens = {};

// ==================== TASK 1: Get all books ====================
app.get('/api/books', (req, res) => {
  res.json({
    success: true,
    count: books.length,
    data: books.map(book => ({
      id: book.id,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      published_year: book.published_year,
      price: book.price
    }))
  });
});

// ==================== TASK 2: Get book by ISBN ====================
app.get('/api/books/isbn/:isbn', (req, res) => {
  const book = books.find(b => b.isbn === req.params.isbn);
  if (!book) {
    return res.status(404).json({ success: false, error: 'Book not found' });
  }
  res.json({ success: true, data: book });
});

// ==================== TASK 3: Get books by Author ====================
app.get('/api/books/author/:author', (req, res) => {
  const authorBooks = books.filter(b => 
    b.author.toLowerCase().includes(req.params.author.toLowerCase())
  );
  res.json({ 
    success: true, 
    count: authorBooks.length, 
    data: authorBooks 
  });
});

// ==================== TASK 4: Get books by Title ====================
app.get('/api/books/title/:title', (req, res) => {
  const titleBooks = books.filter(b => 
    b.title.toLowerCase().includes(req.params.title.toLowerCase())
  );
  res.json({ 
    success: true, 
    count: titleBooks.length, 
    data: titleBooks 
  });
});

// ==================== TASK 5: Get book reviews ====================
app.get('/api/books/reviews/:isbn', (req, res) => {
  const book = books.find(b => b.isbn === req.params.isbn);
  if (!book) {
    return res.status(404).json({ success: false, error: 'Book not found' });
  }
  res.json({ 
    success: true, 
    count: book.reviews.length, 
    data: book.reviews 
  });
});

// ==================== TASK 6: Register new user ====================
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ 
      success: false, 
      error: 'User already exists' 
    });
  }
  
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password,
    role: 'user'
  };
  
  users.push(newUser);
  
  // Generate simple token
  const token = `token_${Date.now()}_${newUser.id}`;
  tokens[token] = newUser.id;
  
  res.status(201).json({
    success: true,
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }
  });
});

// ==================== TASK 7: Login user ====================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid credentials' 
    });
  }
  
  const token = `token_${Date.now()}_${user.id}`;
  tokens[token] = user.id;
  
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !tokens[token]) {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authorized' 
    });
  }
  
  req.userId = tokens[token];
  next();
};

// ==================== TASK 8: Add/Modify review ====================
app.post('/api/books/reviews/:isbn', authenticate, (req, res) => {
  const { rating, comment } = req.body;
  const book = books.find(b => b.isbn === req.params.isbn);
  
  if (!book) {
    return res.status(404).json({ success: false, error: 'Book not found' });
  }
  
  // Check if review exists
  const existingReviewIndex = book.reviews.findIndex(r => r.userId == req.userId);
  
  if (existingReviewIndex > -1) {
    // Update existing review
    book.reviews[existingReviewIndex] = {
      userId: req.userId,
      username: users.find(u => u.id == req.userId)?.username || 'User',
      rating,
      comment,
      date: new Date().toISOString()
    };
  } else {
    // Add new review
    book.reviews.push({
      userId: req.userId,
      username: users.find(u => u.id == req.userId)?.username || 'User',
      rating,
      comment,
      date: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    message: 'Review added/updated successfully'
  });
});

// ==================== TASK 9: Delete review ====================
app.delete('/api/books/reviews/:isbn', authenticate, (req, res) => {
  const book = books.find(b => b.isbn === req.params.isbn);
  
  if (!book) {
    return res.status(404).json({ success: false, error: 'Book not found' });
  }
  
  const initialLength = book.reviews.length;
  book.reviews = book.reviews.filter(r => r.userId != req.userId);
  
  if (book.reviews.length === initialLength) {
    return res.status(404).json({ 
      success: false, 
      error: 'Review not found' 
    });
  }
  
  res.json({
    success: true,
    message: 'Review deleted successfully'
  });
});

// ==================== TASK 10: Get all books - Async Callback ====================
app.get('/api/books/async/all', (req, res) => {
  const fetchBooksAsync = (callback) => {
    setTimeout(() => {
      callback(null, books);
    }, 100);
  };
  
  fetchBooksAsync((error, booksData) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(booksData);
  });
});

// ==================== TASK 11: Search by ISBN - Promises ====================
app.get('/api/books/promise/isbn/:isbn', (req, res) => {
  const searchByISBN = new Promise((resolve, reject) => {
    setTimeout(() => {
      const book = books.find(b => b.isbn === req.params.isbn);
      if (book) {
        resolve(book);
      } else {
        reject(new Error('Book not found'));
      }
    }, 100);
  });
  
  searchByISBN
    .then(book => res.json(book))
    .catch(error => res.status(404).json({ error: error.message }));
});

// ==================== TASK 12: Search by Author - Async/Await with Axios ====================
const axios = require('axios');

app.get('/api/books/external/author/:author', async (req, res) => {
  try {
    // Using Open Library API
    const response = await axios.get(`https://openlibrary.org/search.json`, {
      params: {
        author: req.params.author,
        limit: 5
      }
    });
    
    const books = response.data.docs.map(book => ({
      title: book.title,
      author: book.author_name?.[0] || 'Unknown',
      year: book.first_publish_year,
      isbn: book.isbn?.[0] || 'N/A'
    }));
    
    res.json(books);
  } catch (error) {
    // Fallback to local books if API fails
    const localBooks = books.filter(b => 
      b.author.toLowerCase().includes(req.params.author.toLowerCase())
    );
    res.json(localBooks);
  }
});

// ==================== TASK 13: Search by Title - Axios Promises ====================
app.get('/api/books/external/title/:title', (req, res) => {
  axios.get(`https://openlibrary.org/search.json`, {
    params: {
      title: req.params.title,
      limit: 5
    }
  })
    .then(response => {
      const books = response.data.docs.map(book => ({
        title: book.title,
        author: book.author_name?.[0] || 'Unknown',
        year: book.first_publish_year,
        isbn: book.isbn?.[0] || 'N/A'
      }));
      res.json(books);
    })
    .catch(error => {
      // Fallback to local books
      const localBooks = books.filter(b => 
        b.title.toLowerCase().includes(req.params.title.toLowerCase())
      );
      res.json(localBooks);
    });
});

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Book Review System API',
    endpoints: {
      task1: 'GET /api/books',
      task2: 'GET /api/books/isbn/:isbn',
      task3: 'GET /api/books/author/:author',
      task4: 'GET /api/books/title/:title',
      task5: 'GET /api/books/reviews/:isbn',
      task6: 'POST /api/auth/register',
      task7: 'POST /api/auth/login',
      task8: 'POST /api/books/reviews/:isbn (Auth)',
      task9: 'DELETE /api/books/reviews/:isbn (Auth)',
      task10: 'GET /api/books/async/all',
      task11: 'GET /api/books/promise/isbn/:isbn',
      task12: 'GET /api/books/external/author/:author',
      task13: 'GET /api/books/external/title/:title'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📚 ${books.length} books loaded`);
  console.log(`🔗 Test Task 1: http://localhost:${PORT}/api/books`);
});
