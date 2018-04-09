<%@ Assembly Name="IFS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=4bb36518cdb605fa" %>
<%@ Assembly Name="Microsoft.Web.CommandUI, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="SharePoint" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="Utilities" Namespace="Microsoft.SharePoint.Utilities" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="asp" Namespace="System.Web.UI" Assembly="System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35" %>
<%@ Import Namespace="Microsoft.SharePoint" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="UC_MainFooter.ascx.cs" Inherits="IFS.ControlTemplates.UC_MainFooter" %>

<footer id="main-footer">
    <%if (ShowDisclaimer)
        { %>
    <div id="disclaimer-footer" class="disclaimer-formatted-text">
    </div>
    <%} %>
    <a href="#main" id="btn-goto-top" class="icon-arrow-up">Top</a>
    <p class="copyright">©<%=CurrentYear %> Edmond de Rothschild</p>
</footer>
