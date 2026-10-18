workspace "UrbanPulse" "C4 Architecture of the intelligent urban incident management system." {

    !identifiers hierarchical
 
    model {
    // SYSTEM CONTEXT AND ACTORS
        citizen = person "Citizen"
        analist = person "Analyst"
        operator = person "Operator"
        technician = person "Municipal Technician"
        admin = person "Admin"
        
        urbanPulse = softwareSystem "Software System" {
           mobileApp = container "Citizen Mobile App" "Allows reporting incidents and providing evidence." "React Native" "Mobile App"
           webApp = container "Management Web Portal" "Interface for operators, technicians, and analysts." "React" "Web Browser"
           
           // BACKEND API AND ITS COMPONENTS
           backendApi = container "UrbanPulse API" "Monolith structured by domain modules." "Spring Boot" {
               
               identityComponent = component "Identity & Access" "Manages users, permissions, and authentication (RF01, RF02)." "Spring Security"
               incidentComponent = component "Incident Management" "Core: registration, validation, assignment, and auditable lifecycle (RF03, RF12)." "Spring Boot Module"
               contextComponent = component "Urban Context & Assets" "Identifies district, associates urban assets, and retrieves data (RF21, RF23)." "Spring Boot Module"
               aiComponent = component "Intelligent Assistance" "Duplicate detection, assisted prioritization, and RAG (RF16, RF20)." "Spring Boot Module"
               analyticsComponent = component "Analytics & Reporting" "Generates territorial indicators and historical correlation (RF15, RF25)." "Spring Boot Module"
               notificationComponent = component "Notifications" "Sends configurable alerts for status changes (RF14)." "Spring Boot Module"
           }
           
           database = container "Database" "Stores incidents, users, assets, context, and documents." "PostgreSQL" "Database"
        }
        
        externalSystem = softwareSystem "External System" "External sources of urban, meteorological, or territorial data." "Existing System"

        // 1. Relationships from Users to Frontends
        citizen -> urbanPulse.mobileApp "Logs incidents and checks status"
        analist -> urbanPulse.webApp "Explores indicators and models"
        operator -> urbanPulse.webApp "Validates, prioritizes, and assigns"
        technician -> urbanPulse.webApp "Accepts jobs and documents resolution"
        admin -> urbanPulse.webApp "Manages users and sources"
        
        // 2. Relationships from Frontends to API Components
        urbanPulse.mobileApp -> urbanPulse.backendApi.identityComponent "Authenticates via" "JSON/HTTPS"
        urbanPulse.mobileApp -> urbanPulse.backendApi.incidentComponent "Sends reports and photos to" "JSON/HTTPS"
        
        urbanPulse.webApp -> urbanPulse.backendApi.identityComponent "Manages roles in" "JSON/HTTPS"
        urbanPulse.webApp -> urbanPulse.backendApi.incidentComponent "Validates and assigns via" "JSON/HTTPS"
        urbanPulse.webApp -> urbanPulse.backendApi.contextComponent "Visualizes context in" "JSON/HTTPS"
        urbanPulse.webApp -> urbanPulse.backendApi.aiComponent "Consults procedures in" "JSON/HTTPS"
        urbanPulse.webApp -> urbanPulse.backendApi.analyticsComponent "Extracts reports from" "JSON/HTTPS"
        
        // 3. Internal Component Relationships (Assigning identifiers to hide them later)
        rel1 = urbanPulse.backendApi.incidentComponent -> urbanPulse.backendApi.contextComponent "Requests neighborhood, district, and assets"
        rel2 = urbanPulse.backendApi.incidentComponent -> urbanPulse.backendApi.aiComponent "Verifies possible duplicates"
        rel3 = urbanPulse.backendApi.incidentComponent -> urbanPulse.backendApi.notificationComponent "Triggers status events"
        
        // 4. Relationships to Database and External Systems
        urbanPulse.backendApi.identityComponent -> urbanPulse.database "Reads/writes users" "JDBC"
        urbanPulse.backendApi.incidentComponent -> urbanPulse.database "Saves incidents and statuses" "JDBC"
        urbanPulse.backendApi.contextComponent -> urbanPulse.database "Reads urban assets" "JDBC"
        urbanPulse.backendApi.aiComponent -> urbanPulse.database "Queries document base" "JDBC"
        urbanPulse.backendApi.analyticsComponent -> urbanPulse.database "Calculates aggregated metrics" "JDBC"
        
        urbanPulse.backendApi.contextComponent -> externalSystem "Retrieves contextual observation" "REST/HTTPS"
    }

    views {
        systemContext urbanPulse "SystemContext" {
            include *
            autoLayout
        }
        
        container urbanPulse "Container"{
            include *
            autoLayout
        }
        
        // Level 3 (API Components): Clean stacked boxes view
        component urbanPulse.backendApi "Component" {
            include urbanPulse.backendApi.identityComponent
            include urbanPulse.backendApi.incidentComponent
            include urbanPulse.backendApi.contextComponent
            include urbanPulse.backendApi.aiComponent
            include urbanPulse.backendApi.analyticsComponent
            include urbanPulse.backendApi.notificationComponent
            
            autoLayout tb
            
            // Explicitly hide internal relationships using their identifiers
            exclude rel1 rel2 rel3
        }

        styles {
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Existing System" {
                background #999999
                color #ffffff
            }
            element "Person" {
                shape Person
                background #08427b
                color #ffffff
            }
            element "Container" {
                background #438dd5
                color #ffffff
            }
            element "Component" {
                background #85bbf0
                color #000000
            }
            element "Database" {
                shape Cylinder
            }
            element "Mobile App" {
                shape MobileDevicePortrait
            }
            element "Web Browser" {
                shape WebBrowser
            }
        }
    }

    configuration {
        scope softwaresystem
    }
}