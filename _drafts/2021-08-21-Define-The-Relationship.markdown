---
layout: post
title: 'Define the Relationhip'
tags: software programming data-model graph-db
---

A table in a relational DB tells you nothing about how the columns in it were acquired or how they're related to the table itself.


User table has phone number. How was that phone number acquired? For what purposes can it be used?

Deck table has keys to cards. What is the orientation of the cards wrt the deck? This is a property of the relation between the deck and the card.

Some queries should be disallowed in a relational DB. Like getting all phone numbers? You'd need to know in what way you're getting to the phone number so you can see what governs its use? Or a query all requires looking at all inbound edges to the data to see all governance requirements?
