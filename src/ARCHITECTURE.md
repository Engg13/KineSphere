# KineSphere Architecture

## Overview

KineSphere is a multi-tenant clinical management system designed for physiotherapy clinics.

The system is built with:

- Angular + Ionic (Frontend)
- Firebase Authentication
- Firestore Database
- Multi-tenant clinic architecture

Each clinic operates in an isolated data scope identified by `clinicId`.

---

# Core Architecture

The application uses a layered architecture to separate concerns between authentication, clinic context, and domain services.
Firebase Auth
      ↓
AuthService
      ↓
AppInitService
      ↓
ClinicContextService
      ↓
BaseClinicService
      ↓
Domain Services
      ↓
Firestore

Authentication Layer
AuthService

Responsible only for authentication operations.

Responsibilities:

login

logout

session state

Example:

login(email, password)
logout()
isAuthenticated()
user$

This service does not contain business logic.

Application Initialization
AppInitService

Ensures the application loads the clinic context before services start operating.

Steps:

Wait for Firebase authentication

Load clinic context

Make clinic information globally available

Clinic Context
ClinicContextService

Loads and stores the current clinic environment.

Stored properties:

clinicId
role
uid

Example Firestore structure:

users
  userId
     clinicId
     role

This service is responsible for determining:

which clinic the user belongs to

the user's role

the professional identifier

Base Service Layer
BaseClinicService

All domain services extend this class.

Purpose:

Provide automatic access to:

clinicId
professionalId

Example:

protected get clinicId(): string
protected get professionalId(): string

This guarantees that every document created in Firestore contains the correct tenant context.

Domain Services

These services implement the clinical logic of the application.

Services include:

PacientesService
TratamientosService
EvolucionesService
FlujoClinicoService
RutinasFirestoreService
EjerciciosFirestoreService
TestTemplatesFirestoreService

Responsibilities:

interact with Firestore

enforce clinic isolation

manage domain-specific operations

Example document structure:

pacientes
   pacienteId
      clinicId
      professionalId
      nombre
      createdAt
Clinical Workflow

The clinical process implemented in the system follows this lifecycle:

Patient
   ↓
Initial Evaluation
   ↓
Treatment
   ↓
Progress Sessions
   ↓
Discharge

Firestore collections involved:

pacientes
tratamientos
evoluciones
rutinas
Multi-Tenant Design

All clinical data is scoped by:

clinicId

This ensures isolation between clinics.

Example query:

query(
 collection(db, "pacientes"),
 where("clinicId", "==", clinicId)
)
Security Model

Firestore rules enforce clinic isolation.

Example concept:

allow read, write if
request.auth != null
&& resource.data.clinicId == userClinicId

This prevents users from accessing data belonging to other clinics.

Design Principles

The architecture follows these principles:

Separation of concerns

Authentication, context, and domain logic are separated.

Tenant isolation

All clinical records include clinicId.

Service-driven logic

Pages contain minimal business logic.

Extensibility

New domain modules can be added by extending BaseClinicService.

Future Improvements

Planned improvements include:

Firestore repository abstraction

advanced analytics

clinic-level billing

role-based permissions

offline-first capabilities

Summary

KineSphere implements a scalable SaaS-ready architecture designed for multi-clinic environments.

Key characteristics:

multi-tenant design

secure clinic data isolation

service-based architecture

scalable Firestore data model