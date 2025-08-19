# AdvertV2 Multi-Tenant Application

A comprehensive multi-tenant platform for brand management, vendor relationships, and store operations.

## 🏗️ **Architecture Overview**

This is a multi-tenant application with the following key features:

- **URL-based Tenant Detection**: Each brand has its own subdomain (e.g., `hatsun.tonrin.com`)
- **Role-Based Access Control**: Different user types (Brand Users, Vendors, Distributors)
- **Modern UI/UX**: Responsive design with Material Design components
- **Secure Authentication**: JWT-based authentication with refresh tokens

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ 
- Angular CLI
- .NET 8.0 (for backend API)

### **Installation**

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   ng serve
   ```

3. **Access the Application**
   - Open `http://localhost:4200`
   - For multi-tenant testing, use different subdomains

## 🎨 **Landing Page Features**

### **Multi-Tenant Detection**
The landing page automatically detects the tenant from the URL:
- `hatsun.tonrin.com` → Hatsun Brand
- `demo.tonrin.com` → Demo Brand
- `localhost:4200` → Demo Brand (development)

### **Tenant-Specific Branding**
- Dynamic color schemes based on tenant
- Custom logos and branding
- Tenant-specific content and messaging

### **Modern Design**
- Responsive layout for all devices
- Material Design components
- Smooth animations and transitions
- Professional typography and spacing

## 🔐 **Authentication Flow**

1. **Landing Page** → User visits tenant-specific URL
2. **Login Page** → Secure authentication with tenant context
3. **Dashboard** → Role-based access to features

### **User Types**
- **Brand Users**: Full access to all features
- **Vendors**: Limited access to assigned stores
- **Distributors**: Limited access to assigned regions

## 📱 **Responsive Design**

The application is fully responsive with:
- Mobile-first approach
- Tablet and desktop optimizations
- Touch-friendly interfaces
- Adaptive layouts

## 🎯 **Key Components**

### **Landing Component** (`/landing`)
- Tenant detection and branding
- Feature showcase
- Call-to-action buttons
- Professional footer

### **Login Component** (`/auth/login`)
- Secure authentication form
- Tenant-specific styling
- Error handling and validation
- Demo credentials display

### **Dashboard Component** (`/dashboard`)
- Role-based navigation
- Real-time data display
- User management
- Analytics and reporting

## 🔧 **Configuration**

### **Environment Files**
- `environment.ts` - Development settings
- `environment.prod.ts` - Production settings

### **Tenant Configuration**
Update tenant colors and branding in component files:
```typescript
getTenantColors(): any {
  const colors = {
    'hatsun': { primary: '#1976d2', secondary: '#42a5f5' },
    'demo': { primary: '#388e3c', secondary: '#66bb6a' }
  };
  return colors[this.tenantSubdomain] || colors['default'];
}
```

## 🚀 **Deployment**

### **Local Development**
```bash
ng serve
```

### **Production Build**
```bash
ng build --configuration=production
```

### **Azure Static Web Apps**
The application is configured for Azure Static Web Apps deployment with:
- GitHub Actions workflow
- Environment-specific builds
- Automatic deployment on push to main

## 🔒 **Security Features**

- JWT-based authentication
- Role-based access control
- Tenant data isolation
- Secure token storage
- Automatic logout on token expiry

## 📊 **Multi-Tenant Features**

### **URL-Based Routing**
- Automatic tenant detection from subdomain
- Tenant-specific API endpoints
- Isolated data access

### **Brand Customization**
- Dynamic color schemes
- Custom logos and branding
- Tenant-specific content
- Personalized user experience

## 🛠️ **Development**

### **Adding New Tenants**
1. Update tenant detection logic
2. Add tenant-specific colors
3. Configure API endpoints
4. Test with subdomain

### **Customizing Branding**
1. Update `getTenantColors()` method
2. Add tenant logos to assets
3. Modify content for specific tenants
4. Test responsive design

## 📈 **Performance**

- Lazy loading of components
- Optimized bundle size
- Efficient API calls
- Caching strategies
- CDN-ready assets

## 🔍 **Testing**

### **Multi-Tenant Testing**
- Test with different subdomains
- Verify tenant isolation
- Check branding consistency
- Validate user permissions

### **Responsive Testing**
- Test on mobile devices
- Verify tablet layouts
- Check desktop experience
- Validate touch interactions

## 📞 **Support**

For questions or issues:
1. Check the documentation
2. Review the code comments
3. Test with different tenants
4. Verify API connectivity

---

**Built with Angular 17, TypeScript, and Material Design**
