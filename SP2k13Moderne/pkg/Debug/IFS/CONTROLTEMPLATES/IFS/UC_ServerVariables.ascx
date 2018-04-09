<%@ Assembly Name="IFS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=4bb36518cdb605fa" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="UC_ServerVariables.ascx.cs" Inherits="IFS.ControlTemplates.UC_ServerVariables" %>

<asp:HiddenField runat="server" ClientIDMode="Static" ID="hidLang" />
<asp:HiddenField runat="server" ClientIDMode="Static" ID="hidProfile" />
<asp:HiddenField runat="server" ClientIDMode="Static" ID="hidMarket" />
<asp:HiddenField runat="server" ClientIDMode="Static" ID="hidSite" />
