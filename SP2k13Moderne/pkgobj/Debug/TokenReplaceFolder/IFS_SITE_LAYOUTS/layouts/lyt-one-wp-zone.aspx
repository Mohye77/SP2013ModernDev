<%@ Page Language="C#" Inherits="Microsoft.SharePoint.Publishing.PublishingLayoutPage,Microsoft.SharePoint.Publishing,Version=15.0.0.0,Culture=neutral,PublicKeyToken=71e9bce111e9429c" %>

<%@ Register TagPrefix="SharePointWebControls" Namespace="Microsoft.SharePoint.WebControls" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="WebPartPages" Namespace="Microsoft.SharePoint.WebPartPages" Assembly="Microsoft.SharePoint, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="PublishingWebControls" Namespace="Microsoft.SharePoint.Publishing.WebControls" Assembly="Microsoft.SharePoint.Publishing, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="PublishingNavigation" Namespace="Microsoft.SharePoint.Publishing.Navigation" Assembly="Microsoft.SharePoint.Publishing, Version=15.0.0.0, Culture=neutral, PublicKeyToken=71e9bce111e9429c" %>
<%@ Register TagPrefix="wssuc" TagName="Welcome" Src="~/_controltemplates/15/Welcome.ascx" %>

<asp:Content ContentPlaceholderID="PlaceHolderPageTitle" runat="server">
	<SharePointWebControls:FieldValue ID="PageTitle" FieldName="Title" runat="server"/> | <SharePointWebControls:ProjectProperty Property="Title" runat="server" />
</asp:Content>


<asp:Content ContentPlaceholderID="PlaceHolderMain" runat="server">
    <SharePointWebControls:DelegateControl ID="ServerVariablesDelegate" ControlId="ServerVariablesDelegateUserControl" runat="server"></SharePointWebControls:DelegateControl>
    <SharePointWebControls:DelegateControl ID="DisclaimerDelegate" ControlId="DisclaimerDelegateUserControl" runat="server"></SharePointWebControls:DelegateControl>
    <SharePointWebControls:DelegateControl ID="JSTemplateDelegate" ControlId="JSTemplateDelegateUserControl" runat="server"></SharePointWebControls:DelegateControl>
    <SharePointWebControls:DelegateControl ID="CookiesMessageDelegate" ControlId="CookiesMessageDelegateUserControl" runat="server"></SharePointWebControls:DelegateControl>
	
	<WebPartPages:WebPartZone ID="MainZone" runat="server" Title="Main zone" PartChromeType="None">
		<ZoneTemplate></ZoneTemplate>
	</WebPartPages:WebPartZone>	

</asp:Content>

