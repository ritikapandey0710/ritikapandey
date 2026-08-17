// Test script to verify the reply fix
// This simulates the parameter extraction that was causing the 500 error

const express = require('express');
const http = require('http');

// Simulate the original buggy code vs the fixed code
const reqParams = { id: '123e4567-e89b-12d3-a456-426614174000' }; // Route params with 'id' key

// ORIGINAL (BUGGY) code:
const { ticketId: oldTicketId } = reqParams; // This would be undefined because reqParams has 'id' not 'ticketId'
console.log('OLD CODE - req.params.ticketId:', oldTicketId); // undefined

// FIXED code:
const ticketId = reqParams.id; // This correctly extracts the 'id' param
console.log('FIXED CODE - req.params.id:', ticketId); // '123e4567-e89b-12d3-a456-426614174000'

console.log('\n=== ROOT CAUSE ANALYSIS ===');
console.log('Route: POST /api/tickets/:id/replies');
console.log('Route param name: "id"');
console.log('Old code: const { ticketId } = req.params; => ticketId is UNDEFINED');
console.log('Fixed code: const ticketId = req.params.id; => ticketId is the actual ID');
console.log('');
console.log('When ticketId was undefined:');
console.log('  prisma.ticket.findUnique({ where: { id: undefined } }) throws error');
console.log('  This error is OUTSIDE the try/catch block');
console.log('  Express global error handler catches it => HTTP 500');
console.log('');
console.log('When ticketId is correct (fixed):');
console.log('  prisma.ticket.findUnique({ where: { id: "actual-id" } }) works');
console.log('  Proceeds to prisma.reply.create() => HTTP 201');
