const express = require("express");
const OpenAI = require("openai");

require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

const sqlSchema = `
CREATE TABLE Orders (
  OrderID int,
  CustomerID int,
  OrderDate datetime,
  OrderTime varchar(8),
  PRIMARY KEY (OrderID)
);

CREATE TABLE OrderDetails (
  OrderDetailID int,
  OrderID int,
  ProductID int,
  Quantity int,
  PRIMARY KEY (OrderDetailID)
);

CREATE TABLE Products (
  ProductID int,
  ProductName varchar(50),
  Category varchar(50),
  UnitPrice decimal(10, 2),
  Stock int,
  PRIMARY KEY (ProductID)
);

CREATE TABLE Customers (
  CustomerID int,
  FirstName varchar(50),
  LastName varchar(50),
  Email varchar(100),
  Phone varchar(20),
  PRIMARY KEY (CustomerID)
);
`;

async function runConversation() {
  // Step 1: send the conversation and available functions to the model
  const messages = [
    {
      role: "system",
      content: `Given the following SQL tables, write queries given a user’s request. ${sqlSchema}`,
    },
    {
      role: "user",
      content: `Write a SQL query which computes the total number of customers`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: messages,
  });
  const responseMessage = response.choices;

  console.log("responseMessage", responseMessage);
}

runConversation().then(console.log).catch(console.error);
